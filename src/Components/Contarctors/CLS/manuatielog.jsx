
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
dayjs.extend(utc);
dayjs.extend(timezone);

export default function ManualTimeLog() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [clsCheckInOutData, setCLsCheckInOutData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editObj, setEditObj] = useState([]);
    const [contCls, setContCls] = useState([]);
    const [shiftsData, setShiftsData] = useState([]);
    const [contractorsData, setContactorsData] = useState([]);
    const [selectedContId, setSelectedContId] = useState(null);
    const [selectedContCLId, setSelectedContCLId] = useState(null);
    const [selectedShiftId, setSelectedShiftId] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
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
                (item) => item.MenuName === "Manage Contractors"
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
                Id: formData?.Id,
                CheckIn: checkIn,
                CheckOut: checkOut,
                UpdatedBy: sessionUserData?.Id,
            }

            const response = await fetchWithAuth(
                `contractor/UpdateCLLog`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (response.ok) {
                const data = await response.json();
                setEditSubmitLoading(false);

                if (data.ResultData.Status === 'Success') {
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

                        handleFilterSubmit();
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

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`contractor/getCLSByDate?ShiftTypeId=0&ContractorId=0&CLId=0&Date=${selectedDate}&OrgId=${sessionUserData?.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setCLsCheckInOutData(data.ResultData);
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
        if (sessionUserData.OrgId) {
            fetchData();
        }
    }, [sessionUserData]);

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

    const handleFilterSubmit = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`contractor/getCLSByDate?ShiftTypeId=${selectedShiftId ?? 0}&ContractorId=${selectedContId ?? 0}&CLId=${selectedContCLId ?? 0}&Date=${selectedDate}&OrgId=${sessionUserData?.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setCLsCheckInOutData(data.ResultData);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    const filteredData = clsCheckInOutData && clsCheckInOutData.filter((item) => {
        const clName = item?.CLName?.toLowerCase() || '';
        const aadharNo = item?.AadharNo?.toLowerCase() || '';
        const contName = item?.ContractorName?.toLowerCase() || '';

        const query = searchQuery.toLowerCase();

        return (
            clName.includes(query) ||
            aadharNo.includes(query) ||
            contName.includes(query)
        );
    });

    const handleEdit = (item) => {
        setEditObj(item);
    };

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;
    const totalPages = Math.ceil(filteredData?.length / recordsPerPage);

    // Get current records to display
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredData?.slice(indexOfFirstRecord, indexOfLastRecord);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const getPaginationNumbers = () => {
        const totalNumbers = 7; // how many numbers max to show (including ...)
        const visiblePages = [];

        if (totalPages <= totalNumbers) {
            // show all pages if small
            for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
        } else {
            const left = Math.max(2, currentPage - 1);
            const right = Math.min(totalPages - 1, currentPage + 1);

            visiblePages.push(1); // always show first page

            if (left > 2) visiblePages.push("..."); // gap before current

            for (let i = left; i <= right; i++) {
                visiblePages.push(i);
            }

            if (right < totalPages - 1) visiblePages.push("..."); // gap after current

            visiblePages.push(totalPages); // always show last page
        }

        return visiblePages;
    };


    const handlePageClick = (page) => {
        if (page !== "...") setCurrentPage(page);
    };

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const formatAsGiven = (iso) =>
        iso ? dayjs(iso.replace(/Z$/, "")).format("DD-MM-YYYY HH:mm") : "";

    // Utility function for Aadhar formatting
    const formatAadhar = (aadhar) => {
        if (!aadhar) return "";
        return aadhar.toString().replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
    };

    //   const showAddAadharBtn = sessionActionIds?.includes(17);
    const showEditBtn = sessionActionIds?.includes(3);
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
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        {/* <a
                            className={`btn btn-primary btn-sm d-none d-md-block `}
                            data-bs-toggle="offcanvas"
                            data-bs-target="#offcanvasRightCLTimeUploadExcel"
                            aria-controls="offcanvasRightCLTimeUploadExcel">Bulk Upload
                        </a>
                        <a
                            className={`btn btn-light-primary btn-sm d-block d-md-none `}
                            data-bs-toggle="offcanvas"
                            data-bs-target="#offcanvasRightCLTimeUploadExcel"
                            aria-controls="offcanvasRightCLTimeUploadExcel"><i className="fa-solid fa-plus fs-2"></i>
                        </a> */}
                    </div>
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card-toolbar mb-2">
                        <div
                            className="row d-flex justify-content-start align-items-end"
                            data-kt-customer-table-toolbar="base"
                        >
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
                                {/* <Select
                                    placeholder="Select Labor"
                                    showSearch
                                    allowClear
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    value={selectedContCLId || undefined}
                                    onChange={(value) => setSelectedContCLId(value)}
                                    style={{ width: "100%", height: "2.8rem" }}
                                >
                                    {contCls?.map((item) => (
                                        <Option key={item.Id} value={item.Id}>
                                            {item.Name} - {formatAadhar(item.AadharNo)}
                                        </Option>
                                    ))}
                                </Select> */}
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

                            <div className="col-12 col-md-1 mb-2 d-flex">
                                <button
                                    className="btn btn-light-primary btn-sm border border-primary w-100 w-md-auto"
                                    type="button"
                                    style={{ height: "2.6rem", fontSize: "0.9rem" }}
                                    onClick={handleFilterSubmit}
                                    disabled={dataLoading}
                                >
                                    {dataLoading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card d-md-block d-none mt-0">
                        <div className="card-header border-0 pt-">
                            <div className="card-title">
                                <div className="d-flex align-items-center position-relative my-1">
                                    <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-5">
                                        <span className="path1"></span>
                                        <span className="path2"></span>
                                    </i>
                                    <input
                                        type="text"
                                        data-kt-customer-table-filter="search"
                                        className="form-control form-control-solid w-250px ps-13"
                                        placeholder="Search CL"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="card-body pt-0">
                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-5" id="kt_customers_table">
                                    <thead>
                                        <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
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
                                        {dataLoading ? (
                                            <tr>
                                                <td colSpan="8" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                        ) : currentRecords && currentRecords.length > 0 ? (
                                            currentRecords.map((item, index) => (
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
                                <div className="dt-paging paging_simple_numbers">
                                    <nav aria-label="pagination">
                                        <ul className="pagination">
                                            <li
                                                className={`dt-paging-button page-item ${currentPage === 1 ? "disabled" : ""}`}
                                            >
                                                <button
                                                    className="page-link previous"
                                                    role="link"
                                                    type="button"
                                                    aria-controls="kt_customers_table"
                                                    aria-disabled={currentPage === 1}
                                                    aria-label="Previous"
                                                    onClick={handlePrevious}
                                                >
                                                    <i className="previous"></i>
                                                </button>
                                            </li>

                                            {/* Page Numbers */}
                                            {getPaginationNumbers().map((page, index) => (
                                                <li
                                                    key={index}
                                                    className={`dt-paging-button page-item ${page === currentPage ? "active" : ""}`}
                                                >
                                                    <button
                                                        className="page-link"
                                                        role="link"
                                                        type="button"
                                                        aria-controls="kt_customers_table"
                                                        aria-current={page === currentPage ? "page" : undefined}
                                                        onClick={() => handlePageClick(page)}
                                                        disabled={page === "..."}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            ))}

                                            {/* Next Button */}
                                            <li
                                                className={`dt-paging-button page-item ${currentPage === totalPages ? "disabled" : ""}`}
                                            >
                                                <button
                                                    className="page-link next"
                                                    role="link"
                                                    type="button"
                                                    aria-controls="kt_customers_table"
                                                    aria-disabled={currentPage === totalPages}
                                                    aria-label="Next"
                                                    onClick={handleNext}
                                                >
                                                    <i className="next"></i>
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
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
                        {dataLoading ? (
                            <div className="container"></div>
                        ) : filteredData && filteredData.length > 0 ? (
                            filteredData.map((item, index) => (
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
                    </div>
                </div>
            </div>


            {/* CL Edit CheckIn/Out Offcanvas */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightCLCheckInOutEdit"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: '85%' }}
            >
                <style>
                    {`
                  @media (min-width: 768px) { /* Medium devices and up (md) */
                      #offcanvasRightCLCheckInOutEdit {
                          width: 30% !important;
                      }
                  }
              `}
                </style>
                <form onSubmit={handleCLChekInOutSubmit}>
                    <div className="offcanvas-header d-flex justify-content-between align-items-center">
                        <h5 id="offcanvasRightLabel" className="mb-0">
                            Edit CL CheckIn/Out
                        </h5>
                        <div className="d-flex align-items-center">
                            <button
                                type="submit"
                                className="me-2 d-none d-md-block btn btn-primary px-4 btn-sm"
                                disabled={editSubmitLoading}
                            >
                                {editSubmitLoading ? "Submitting..." : "Submit"}
                            </button>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="offcanvas"
                                aria-label="Close"
                            ></button>
                        </div>
                    </div>
                    <div
                        className="offcanvas-body"
                        style={{
                            marginTop: "-2rem",
                            maxHeight: "42rem",
                            overflowY: "auto",
                        }}
                    >
                        <div className="row">
                            {/* Display Readonly fields as text */}
                            <div className="p-3 border rounded bg-light mb-2">
                                <dl className="row">
                                    <dt className="col-4 text-muted fw-semibold">Agency Name:</dt>
                                    <dd className="col-8 fw-bold mb-2">{formData.ContractorName}</dd>

                                    <dt className="col-4 text-muted fw-semibold">CL Name:</dt>
                                    <dd className="col-8 fw-bold mb-2">{formData.CLName}</dd>

                                    <dt className="col-4 text-muted fw-semibold">CL Aadhar:</dt>
                                    <dd className="col-8 fw-bold mb-2">{formatAadhar(formData.AadharNo)}</dd>

                                    <dt className="col-4 text-muted fw-semibold">Shift:</dt>
                                    <dd className="col-8 fw-bold mb-2">{formData.ShiftName || "N/A"}</dd>
                                </dl>
                            </div>

                            {/* <hr className="text-primary" /> */}
                            <div className="col-12 my-5">
                                <label className="form-label">CheckIn</label>
                                <div className="d-flex gap-2">
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={formData.CheckInDate || ""}
                                        max={formData.CheckOutDate || undefined}
                                        onChange={(e) => setFormData({ ...formData, CheckInDate: e.target.value })}
                                        disabled={true}
                                        style={{ height: '2.8rem' }}
                                    />
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.CheckInTime || ""}
                                        max={
                                            formData.CheckInDate &&
                                                formData.CheckOutDate &&
                                                formData.CheckInDate === formData.CheckOutDate
                                                ? formData.CheckOutTime || undefined
                                                : undefined
                                        }
                                        onChange={(e) => setFormData({ ...formData, CheckInTime: e.target.value })}
                                        disabled={true}
                                        style={{ height: '2.8rem' }}
                                    />
                                </div>
                            </div>

                            <div className="col-12 mb-3">
                                <label className="form-label">CheckOut<span className="text-danger">*</span></label>
                                <div className="d-flex gap-2">
                                    {/* Date */}
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={formData.CheckOutDate || ""}
                                        min={formData.CheckInDate || undefined} // Cannot be before CheckIn date
                                        max={dayjs().format("YYYY-MM-DD")} // Cannot be after today
                                        onChange={(e) => setFormData({ ...formData, CheckOutDate: e.target.value })}
                                        style={{ height: '2.8rem' }}
                                    />

                                    {/* Time */}
                                    <input
                                        type="time"
                                        className="form-control"
                                        value={formData.CheckOutTime || ""}
                                        max={isToday ? maxTime : undefined}
                                        style={{ height: '2.8rem' }}
                                        onChange={(e) => {
                                            const val = e.target.value; // HH:mm
                                            const selectedDateTime = dayjs(`${formData.CheckOutDate} ${val}`);

                                            const now = dayjs();

                                            // Prevent future datetime
                                            if (selectedDateTime.isAfter(now)) {
                                                alert("CheckOut cannot be in the future");
                                                return; // ignore the change
                                            }

                                            // Prevent CheckOut < CheckIn if same day
                                            if (
                                                formData.CheckInDate &&
                                                formData.CheckInTime &&
                                                formData.CheckOutDate === formData.CheckInDate
                                            ) {
                                                const checkInDT = dayjs(`${formData.CheckInDate} ${formData.CheckInTime}`);
                                                if (selectedDateTime.isBefore(checkInDT)) {
                                                    alert("CheckOut cannot be earlier than CheckIn");
                                                    return;
                                                }
                                            }
                                            setFormData({ ...formData, CheckOutTime: val });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="d-md-none d-flex justify-content-center mb-3">
                        <button
                            type="submit"
                            className="btn btn-primary px-4 btn-sm"
                            disabled={editSubmitLoading}
                        >
                            {editSubmitLoading ? "Submitting..." : "Submit"}
                        </button>
                    </div>
                </form>
            </div>

            <ManageCLAadhar />
            <CLTimeUplaodExcel />
        </Base1>
    )
}