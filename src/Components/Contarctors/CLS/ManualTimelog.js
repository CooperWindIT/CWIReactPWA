
import React, { useState, useEffect } from "react";
import Base1 from "../../Config/Base1";
import '../../Config/Pagination.css';
import '../../Config/Loader.css';
import { useNavigate } from "react-router-dom";
import ManageCLAadhar from "./CLAadhar";
import { Select } from "antd";
import Swal from "sweetalert2";
import CLTimeUplaodExcel from "./CLTimeUploadExcel";
import { fetchWithAuth } from "../../../utils/api";
import timezone from "dayjs/plugin/timezone";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Pagination from "../../Pagination/Pagination";
dayjs.extend(utc);
dayjs.extend(timezone);

export default function ManualTimeLog() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [clsCheckInOutData, setCLsCheckInOutData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editObj, setEditObj] = useState([]);
    const [contCls, setContCls] = useState([]);
    const [shiftsData, setShiftsData] = useState([]);
    const [contractorsData, setContactorsData] = useState([]);
    const [selectedContId, setSelectedContId] = useState(null);
    const [selectedShiftTypeId, setSelectedShiftTypeId] = useState(null);
    const [selectedContCLId, setSelectedContCLId] = useState(null);
    const [selectedShiftId, setSelectedShiftId] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [clsDataCache, setCLsDataCache] = useState({});
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;
    const [formData, setFormData] = useState({
        UpdatedBy: "",
        OrgId: "",
        Id: "",
        ContractorName: "",
        ShiftName: "",
        AadharNo: "",
        CLName: "",
        CheckInDate: "",
        CheckInTime: "",
        CheckOutDate: "",
        CheckOutTime: "",
    });

    const { Option } = Select;

    const [navigationPath, setNavigationPath] = useState("");

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

            const contractorsMenu = parsedMenu.find(
                (item) => item.MenuName === "Manual Time Log"
            );

            if (contractorsMenu) {
                const actionIdArray = contractorsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    useEffect(() => {
        if (!editObj) return;
        const checkInDate = editObj.CheckIn ? dayjs.utc(editObj.CheckIn).format("YYYY-MM-DD") : "";
        const checkInTime = editObj.CheckIn ? dayjs.utc(editObj.CheckIn).format("HH:mm") : "";

        const checkOutDate = editObj.CheckOut ? dayjs.utc(editObj.CheckOut).format("YYYY-MM-DD") : "";
        const checkOutTime = editObj.CheckOut ? dayjs.utc(editObj.CheckOut).format("HH:mm") : "";

        if (editObj) {
            setFormData({
                UpdatedBy: sessionUserData.UserId || "",
                OrgId: editObj?.OrgId || "",
                Id: editObj?.Id || "",
                ContractorName: editObj?.ContractorName || "",
                ShiftName: editObj?.Shiftname || "",
                AadharNo: editObj?.AadharNo || "",
                CLName: editObj?.CLName || "",
                CheckInDate: checkInDate,
                CheckInTime: checkInTime,
                CheckOutDate: checkOutDate,
                CheckOutTime: checkOutTime,
            });
        }
    }, [editObj, sessionUserData]);

    const handleCLChekInOutSubmit = async (e) => {
        e.preventDefault();

        const checkIn = formData.CheckInDate && formData.CheckInTime
            ? `${formData.CheckInDate} ${formData.CheckInTime}:00`
            : null;

        const checkOut = formData.CheckOutDate && formData.CheckOutTime
            ? `${formData.CheckOutDate} ${formData.CheckOutTime}:00`
            : null;

        try {
            setEditSubmitLoading(true);

            const payload = {
                OrgId: sessionUserData?.OrgId,
                UpdatedBy: sessionUserData?.Id,
                Id: editObj?.CheckIn ? (formData?.Id || 0) : 0,
                ContractorId: editObj?.ContractorId || formData?.ContractorId,
                CheckIn: checkIn,
                CheckOut: checkOut,
                Date: selectedDate,
                ShiftTypeId: selectedShiftTypeId || editObj?.ShiftTypeId || formData?.ShiftTypeId,
                CLId: editObj?.CLId || formData?.CLId || 0,
                // Date: formData?.CheckInDate || formData?.Date,
            };

            const response = await fetchWithAuth(`contractor/UpdateCLLog`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();

                if (data.ResultData?.Status === "Success") {
                    Swal.fire({
                        title: "Success",
                        text: "The CL details have been updated successfully.",
                        icon: "success",
                    }).then(() => {
                        const offcanvasElement = document.getElementById("offcanvasRightCLCheckInOutEdit");
                        const bsOffcanvas = window.bootstrap?.Offcanvas.getInstance(offcanvasElement);
                        if (bsOffcanvas) {
                            bsOffcanvas.hide();
                        }
                        fetchCLsDataByDate(currentPage, true);
                    });
                } else {
                    Swal.fire({
                        title: "Error",
                        text: data?.ResultData?.ResultMessage || "Failed to update the data.",
                        icon: "error",
                    });
                }
            } else {
                Swal.fire({
                    title: "Error",
                    text: "Failed to submit the request.",
                    icon: "error",
                });
            }
        } catch (error) {
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setEditSubmitLoading(false);
        }
    };

    const todayDate = dayjs().format("YYYY-MM-DD");
    const isToday = formData.CheckOutDate === todayDate;
    const maxTime = dayjs().format("HH:mm");

    const formatTodayDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(formatTodayDate(today));

    const fetchCLsDataByDate = async (page = 1, force = false) => {
        if (!force && clsDataCache[page]) {
            setCLsCheckInOutData(clsDataCache[page]);
            setCurrentPage(page);
            return;
        }
        setLoading(true);

        const payload = {
            ServiceName: "GetCLCheckInsFilter",
            PageNumber: page,
            PageSize: recordsPerPage,
            Params: {
                OrgId: sessionUserData.OrgId,
                CLId: selectedContCLId || 0,
                ContractorId: selectedContId || 0,
                Date: selectedDate,
                ShiftTypeId: selectedShiftId || 0,
            },
        };

        try {
            const response = await fetchWithAuth(`contractor/GetCLCheckInsFilter`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to fetch machines");

            const data = await response.json();
            const pageData = data.data.result || [];
            const total = data.data.output.TotalCount || 0;

            setCLsDataCache((prev) => ({ ...prev, [page]: pageData }));
            setCLsCheckInOutData(pageData);
            setTotalRecords(total);
            setCurrentPage(page);

        } catch (error) {
            console.error("Error fetching machines:", error.message);
            setCLsCheckInOutData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchCLsDataByDate(1);
        }
    }, [sessionUserData]);

    const handleFilterSubmit = () => {
        setCLsDataCache({}); // clear cache when filters change
        fetchCLsDataByDate(1, true); // fetch fresh with updated filters
    };

    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    const fetchContractors = async () => {
        try {
            const response = await fetchWithAuth(`contractor/getContractors?OrgId=${sessionUserData.OrgId}&ShiftTypeId=0`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setContactorsData(data.ResultData);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchContractors();
        }
    }, [sessionUserData]);

    const fetchContractorCLs = async () => {
        if (sessionUserData.OrgId) {
            try {
                const response = await fetchWithAuth(`contractor/getCLS?OrgId=${sessionUserData?.OrgId}&ContractorId=${selectedContId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setContCls(data.ResultData || []);
                } else {
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                setContCls([]);
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && selectedContId) {
            fetchContractorCLs();
        }
    }, [sessionUserData, selectedContId]);

    const fetchShiftsData = async () => {
        try {
            if (sessionUserData.OrgId) {
                const response = await fetchWithAuth(`contractor/getShiftTimings?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setShiftsData(data.ResultData);
                } else {
                    console.error('Failed to fetch shifts data:', response.statusText);
                }
            }
        } catch (error) {
            console.error('Error fetching shifts data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchShiftsData();
        }
    }, [sessionUserData]);

    const handleEdit = (item) => {
        setEditObj(item);
    };

    const formatAsGiven = (iso) =>
        iso ? dayjs(iso.replace(/Z$/, "")).format("DD-MM-YYYY HH:mm") : "";

    // Utility function for Aadhar formatting
    const formatAadhar = (aadhar) => {
        if (!aadhar) return "";
        return aadhar.toString().replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
    };

    const showEditBtn = sessionActionIds?.includes(3);
    //   const showAddAadharBtn = sessionActionIds?.includes(17);
    //   const showEditBtn = sessionActionIds?.includes(3);

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Manual Time Log</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Manage CLs Log</li>
                        </ul>
                    </div>
                    {/*
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        <a
                            className={`btn btn-primary btn-sm d-none d-md-block `}
                            data-bs-toggle="offcanvas"
                            data-bs-target="#offcanvasRightCLTimeUploadExcel"
                            aria-controls="offcanvasRightCLTimeUploadExcel"><span className="d-none d-md-inline">Bulk Upload</span>
                        </a>
                    </div> */}
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card mb-2 shadow-sm">
                        <div className="p-2">
                            <div className="d-flex align-items-center mb-4 border-bottom pb-3">
                                <i className="bi bi-filter-right fs-2 text-primary me-2"></i>
                                <h5 className="text-gray-800 fw-bolder mb-0">Filter Parameters</h5>
                            </div>
                            <div className="row d-flex justify-content-start align-items-end" data-kt-customer-table-toolbar="base">
                                <div className="col-12 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label">Date <span className="text-danger">*</span></label>
                                    <input
                                        type="date"
                                        name="FromDate"
                                        className="form-control"
                                        style={{ width: "100%", height: "2.8rem", fontSize: "0.9rem" }}
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>
                                <div className="col-12 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label">Contractor</label>
                                    <Select
                                        placeholder="Select Contractor"
                                        showSearch
                                        allowClear
                                        filterOption={(input, option) =>
                                            option?.children?.toLowerCase().includes(input.toLowerCase())
                                        }
                                        value={selectedContId || undefined}
                                        onChange={(value) => setSelectedContId(value)}
                                        style={{ width: "100%", height: "2.8rem" }}
                                    >
                                        {contractorsData?.map((item) => (
                                            <Option key={item.Id} value={item.Id}>
                                                {item.ContractorName}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-3 mb-2 d-flex flex-column">
                                    <label className="form-label">Casual Labor</label>
                                    <Select
                                        placeholder="Select Labor"
                                        showSearch
                                        allowClear
                                        filterOption={(input, option) =>
                                            option?.label?.toLowerCase().includes(input.toLowerCase())
                                        }
                                        value={selectedContCLId || undefined}
                                        onChange={(value) => setSelectedContCLId(value)}
                                        style={{ width: "100%", height: "2.8rem" }}
                                        options={contCls?.map((item) => ({
                                            label: `${item.Name} - ${formatAadhar(item.AadharNo)}`,
                                            value: item.Id,
                                        }))}
                                    />

                                </div>
                                <div className="col-12 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label">Shift</label>
                                    <Select
                                        placeholder="Select Shift"
                                        showSearch
                                        allowClear
                                        filterOption={(input, option) =>
                                            option?.children?.toLowerCase().includes(input.toLowerCase())
                                        }
                                        value={selectedShiftId || undefined}
                                        onChange={(value) => setSelectedShiftId(value)}
                                        style={{ width: "100%", height: "2.8rem" }}
                                    >
                                        {shiftsData?.map((item) => (
                                            <Option key={item.Id} value={item.Id}>
                                                {item.ShiftName}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>

                                <div className="col-auto mb-2 d-flex">
                                    <button
                                        className="btn btn-light-primary btn-sm border border-primary w-100 w-md-auto"
                                        type="button"
                                        style={{ height: "2.6rem", fontSize: "0.9rem" }}
                                        onClick={handleFilterSubmit}
                                        disabled={loading}
                                    >
                                        <i className="bi bi-filter-circle"></i>{loading ? 'Submitting...' : 'Submit'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card d-md-block d-none mt-0 mb-10 shadow-sm">
                        <div className="table-responsive">
                            <table className="table align-middle table-hover gs-7 gy-4 mb-0 fs-6">
                                <thead className="bg-light-primary">
                                    <tr className="text-start text-muted fw-bold fs-7 text-uppercase border-bottom-2 border-primary">
                                        <th className="">S.No</th>
                                        <th className="min-w-125px">Contractor</th>
                                        <th className="min-w-125px">CL Name</th>
                                        <th className="min-w-125px">Aadhar</th>
                                        <th className="min-w-125px">CheckIn</th>
                                        <th className="min-w-125px">CheckOut</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-semibold text-gray-600">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="8" className="text-center">
                                                <div className="container"></div>
                                            </td>
                                        </tr>
                                    ) : clsCheckInOutData && clsCheckInOutData?.length > 0 ? (
                                        clsCheckInOutData?.map((item, index) => (
                                            <tr>
                                                <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                <td>
                                                    <a className="text-gray-800 text-hover-primary mb-1">{item.ContractorName}</a>
                                                </td>
                                                <td>
                                                    <a className="text-gray-800 text-hover-primary mb-1">{item.CLName}</a>
                                                </td>
                                                <td>{formatAadhar(item.AadharNo)}</td>
                                                <td className="text-success">{formatAsGiven(item.CheckIn) || 'N/A'}</td>
                                                <td className="text-info">{formatAsGiven(item.CheckOut) || 'N/A'}</td>
                                                <td className="text-center">
                                                    <i
                                                        className="fa-regular fa-pen-to-square me-2 text-primary text-hover-warning"
                                                        style={{
                                                            cursor: showEditBtn ? "pointer" : "not-allowed",
                                                            opacity: showEditBtn ? 1 : 0.5,
                                                            pointerEvents: showEditBtn ? "auto" : "none",
                                                            filter: showEditBtn ? "none" : "blur(1px)",
                                                        }}
                                                        data-bs-toggle="offcanvas"
                                                        data-bs-target="#offcanvasRightCLCheckInOutEdit"
                                                        aria-controls="offcanvasRightCLCheckInOutEdit"
                                                        onClick={() => showEditBtn && handleEdit(item)}
                                                    ></i>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="text-center">
                                                <p>No Data Available</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="mx-4">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                                    recordsPerPage={10} // This MUST match the 'limit' you use in your API call
                                    onPageChange={(page) => fetchCLsDataByDate(page)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="d-block d-md-none">
                        <div className="d-flex align-items-center position-relative my-1">
                            <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-5">
                                <span className="path1"></span>
                                <span className="path2"></span>
                            </i>
                            <input
                                type="text"
                                data-kt-customer-table-filter="search"
                                className="form-control form-control w-100 ps-13"
                                placeholder="Search Users"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {loading ? (
                            <div className="container"></div>
                        ) : clsCheckInOutData && clsCheckInOutData.length > 0 ? (
                            clsCheckInOutData.map((item, index) => (
                                <div key={item.Id} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <span>
                                                <div className={`badge ${'badge-light-success'}`}>
                                                    Active
                                                </div>
                                            </span>
                                            <div>
                                                <i
                                                    className={`fa-regular fa-pen-to-square me-3 text-info cursor-pointer`}
                                                    style={{
                                                        cursor: showEditBtn && item.CheckIn ? "pointer" : "not-allowed",
                                                        opacity: showEditBtn && item.CheckIn ? 1 : 0.5,
                                                        pointerEvents: showEditBtn && item.CheckIn ? "auto" : "none",
                                                        filter: showEditBtn && item.CheckIn ? "none" : "blur(1px)",
                                                    }}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightCLCheckInOutEdit"
                                                    aria-controls="offcanvasRightCLCheckInOutEdit"
                                                    onClick={() => showEditBtn && item.CheckIn && handleEdit(item)}
                                                ></i>
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">CL Name:</span>
                                                <span className="fw-semibold">{item.CLName.length > 20 ? item.CLName.slice(0, 20) + '...' : item.CLName}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Aadhar No:</span>
                                                <span className="fw-semibold">{formatAadhar(item.AadharNo)}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">CheckIn:</span>
                                                <span className="fw-semibold">{formatAsGiven(item.CheckIn) || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">CheckOut:</span>
                                                <span className="fw-semibold">{formatAsGiven(item.CheckOut) || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                            recordsPerPage={10} // This MUST match the 'limit' you use in your API call
                            onPageChange={(page) => fetchCLsDataByDate(page)}
                        />
                    </div>
                </div>
            </div>


            {/* CL Edit CheckIn/Out Offcanvas */}
            <div
                className="offcanvas offcanvas-end border-0"
                tabIndex="-1"
                id="offcanvasRightCLCheckInOutEdit"
            >
                <form onSubmit={handleCLChekInOutSubmit} className="h-100 d-flex flex-column">

                    <div className="premium-header">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="mb-1 fw-bold">
                                    <i className="bi bi-pencil-square text-primary me-2"></i>
                                    Edit CheckIn / CheckOut
                                </h5>
                                <small className="text-muted">
                                    Update attendance information
                                </small>
                            </div>

                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="offcanvas"
                            ></button>
                        </div>
                    </div>

                    <div className="offcanvas-body premium-body flex-grow-1">

                        <div className="info-card">
                            <div className="info-item">
                                <span>Agency Name</span>
                                <strong>{formData.ContractorName}</strong>
                            </div>

                            <div className="info-item">
                                <span>CL Name</span>
                                <strong>{formData.CLName}</strong>
                            </div>

                            <div className="info-item">
                                <span>Aadhar</span>
                                <strong>{formatAadhar(formData.AadharNo)}</strong>
                            </div>

                            <div className="info-item">
                                <span>Shift</span>
                                <strong>{formData.ShiftName || "N/A"}</strong>
                            </div>
                        </div>

                        {!editObj?.CheckIn && (
                            <div className="section-card">
                                <div className="section-title">
                                    <i className="bi bi-clock-history me-2"></i>
                                    Shift Selection
                                </div>

                                <label className="form-label">
                                    Shift <span className="text-danger">*</span>
                                </label>

                                <Select
                                    placeholder="Select Shift"
                                    showSearch
                                    allowClear
                                    value={selectedShiftTypeId || undefined}
                                    onChange={(value) => setSelectedShiftTypeId(value)}
                                    style={{ width: "100%" }}
                                >
                                    {shiftsData?.map((item) => (
                                        <Option key={item.Id} value={item.Id}>
                                            {item.ShiftName}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        )}

                        <div className="section-card">
                            <div className="section-title">
                                <i className="bi bi-box-arrow-in-right me-2 text-success"></i>
                                Check In Details
                            </div>

                            <label className="form-label">
                                Check In <span className="text-danger">*</span>
                            </label>

                            <div className="row g-2">
                                <div className="col-6">
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={formData.CheckInDate || ""}
                                        max={formData.CheckOutDate || undefined}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                CheckInDate: e.target.value
                                            })
                                        }
                                    />
                                </div>

                                <div className="col-6">
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.CheckInTime || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                CheckInTime: e.target.value
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="section-card">
                            <div className="section-title">
                                <i className="bi bi-box-arrow-right me-2 text-danger"></i>
                                Check Out Details
                            </div>

                            <label className="form-label">
                                Check Out <span className="text-danger">*</span>
                            </label>

                            <div className="row g-2">
                                <div className="col-6">
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={formData.CheckOutDate || ""}
                                        min={formData.CheckInDate || undefined}
                                        max={dayjs().format("YYYY-MM-DD")}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                CheckOutDate: e.target.value
                                            })
                                        }
                                    />
                                </div>

                                <div className="col-6">
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.CheckOutTime || ""}
                                        max={isToday ? maxTime : undefined}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                CheckOutTime: e.target.value
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="bottom-action">
                        <button
                            type="submit"
                            className="btn save-btn text-white w-100"
                            disabled={editSubmitLoading}
                        >
                            {editSubmitLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Saving Changes...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-circle-fill me-2"></i>
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>

            <style>
                {`
                #offcanvasRightCLCheckInOutEdit{
                    width:85% !important;
                    border-radius:24px 0 0 24px;
                    overflow:hidden;
                    background:#f8fafc;
                }

                @media(min-width:768px){
                    #offcanvasRightCLCheckInOutEdit{
                        width:40% !important;
                    }
                }

                @media(min-width:1200px){
                    #offcanvasRightCLCheckInOutEdit{
                        width:38% !important;
                    }
                }

                .premium-header{
                    position:sticky;
                    top:0;
                    z-index:1000;
                    background:rgba(255,255,255,.95);
                    backdrop-filter:blur(12px);
                    padding:20px;
                    border-bottom:1px solid #e5e7eb;
                }

                .premium-body{
                    padding:20px;
                    background:#f8fafc;
                }

                .info-card,
                .section-card{
                    background:#fff;
                    border-radius:18px;
                    padding:18px;
                    margin-bottom:18px;
                    box-shadow:0 8px 25px rgba(0,0,0,.06);
                }

                .info-item{
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:10px 0;
                    border-bottom:1px solid #f1f5f9;
                }

                .info-item:last-child{
                    border-bottom:none;
                }

                .info-item span{
                    color:#64748b;
                    font-size:13px;
                    font-weight:500;
                }

                .info-item strong{
                    color:#0f172a;
                    text-align:right;
                }

                .section-title{
                    font-size:15px;
                    font-weight:700;
                    color:#0f172a;
                    margin-bottom:15px;
                }

                .form-label{
                    font-size:13px;
                    font-weight:600;
                    color:#334155;
                }

                .form-control{
                    height:48px;
                    border-radius:12px;
                    border:1px solid #dbe3ee;
                }

                .form-control:focus{
                    border-color:#0d6efd;
                    box-shadow:0 0 0 4px rgba(13,110,253,.15);
                }

                .bottom-action{
                    position:sticky;
                    bottom:0;
                    background:#fff;
                    padding:15px 20px;
                    border-top:1px solid #e5e7eb;
                }

                .save-btn{
                    height:50px;
                    border:none;
                    border-radius:50px;
                    font-weight:600;
                    background:linear-gradient(135deg,#0d6efd,#3b82f6);
                    box-shadow:0 10px 20px rgba(13,110,253,.25);
                }
                `}
            </style>

            <ManageCLAadhar />
            <CLTimeUplaodExcel />
        </Base1>
    )
}