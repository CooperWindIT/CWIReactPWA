
import React, { useState, useEffect } from "react";
import Base1 from "../Config/Base1";
import '../Config/Pagination.css';
import '../Config/Loader.css';
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../utils/api";
import { Select, Button } from 'antd';

export default function CLAttendanceList() {

    const navigate = useNavigate();
    const today = new Date();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [clAttendance, setCLAttendance] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [navigationPath, setNavigationPath] = useState("");

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-based month
    const years = [currentYear - 2, currentYear - 1, currentYear];

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

    const handleFilterSubmit = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`contractor/TotalMonthCLCheckins?OrgId=${sessionUserData?.OrgId}&SelectedMonth=${selectedMonth}&SelectedYear=${selectedYear}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setCLAttendance(data.ResultData);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">CL Attendance</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">CL attendance</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card mb-2 shadow-sm p-5">
                        <div className="d-flex align-items-center mb-4 border-bottom pb-3">
                            <i className="bi bi-filter-right fs-2 text-primary me-2"></i>
                            <h5 className="text-gray-800 fw-bolder mb-0">Filter Parameters</h5>
                        </div>

                        <div className="row d-flex justify-content-start align-items-end g-3" data-kt-customer-table-toolbar="base">
                            <div className="col-6 col-md-3 mb-2">
                                <label className="form-label d-block">Month <span className="text-danger">*</span></label>
                                <Select
    showSearch
    className="w-100"
    placeholder="Select Month"
    optionFilterProp="children"
    value={selectedMonth || undefined} // 'undefined' shows the placeholder if value is null/0
    onChange={(value) => setSelectedMonth(Number(value))}
    style={{ height: "38px" }}
>
    {months.map((month, index) => {
        const monthNumber = index + 1;
        const isDisabled = selectedYear === currentYear && monthNumber > currentMonth;
        return (
            <Select.Option key={monthNumber} value={monthNumber} disabled={isDisabled}>
                {month}
            </Select.Option>
        );
    })}
</Select>
                            </div>

                            <div className="col-6 col-md-2 mb-2">
                                <label className="form-label d-block">Year <span className="text-danger">*</span></label>
                                <Select
                                    showSearch
                                    className="w-100"
                                    placeholder="Select Year"
                                    optionFilterProp="children"
                                    value={selectedYear}
                                    onChange={(value) => setSelectedYear(value)}
                                    style={{ height: "38px" }}
                                >
                                    {years.map((year) => (
                                        <Select.Option key={year} value={year}>
                                            {year}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </div>

                            <div className="col-auto mb-2">
                                <Button
                                    type="primary"
                                    ghost
                                    icon={<i className="bi bi-filter-circle me-1"></i>}
                                    loading={dataLoading}
                                    onClick={handleFilterSubmit}
                                    style={{
                                        height: "38px",
                                        display: 'flex',
                                        alignItems: 'center',
                                        borderColor: '#009ef7' // Adjust to match your primary color
                                    }}
                                    className="w-100 w-md-auto fw-bold"
                                >
                                    {dataLoading ? 'Submitting...' : 'Submit'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="card d-md-block d-none mt-5 shadow-sm">
                        <div className="pt-0">
                            <div className="table-responsive">
                                <table className="table align-middle table-hover gs-7 gy-3 mb-0 fs-6 rounded">
                                    <thead className="bg-light-primary">
                                        <tr className="text-start text-muted fw-bold fs-8 text-uppercase gs-0 border-bottom-2 border-primary py-3">
                                            <th>S.No</th>
                                            <th className="min-w-200px">Contractor</th>
                                            {clAttendance?.length > 0 &&
                                                Object.keys(clAttendance[0])
                                                    .filter((key) => key !== "ContractorName")
                                                    .map((dayKey, idx) => {
                                                        const dayNumber = idx + 1;
                                                        const dateObj = new Date(selectedYear, selectedMonth - 1, dayNumber); // month is 0-based
                                                        const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" }); // Mon, Tue, Wed...
                                                        const isSunday = dateObj.getDay() === 0; // 0 = Sunday

                                                        return (
                                                            <th
                                                                key={idx}
                                                                className={`min-w-75px ${isSunday ? "text-danger" : ""}`}
                                                            >
                                                                {`Day-${dayNumber} (${weekday})`}
                                                            </th>
                                                        );
                                                    })}
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {dataLoading ? (
                                            <tr>
                                                <td colSpan="100%" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                        ) : clAttendance && clAttendance.length > 0 ? (
                                            clAttendance.map((contractor, index) => {
                                                // ✅ Calculate total attendance
                                                const totalCount = Object.keys(contractor)
                                                    .filter((key) => key !== "ContractorName")
                                                    .reduce((sum, key) => {
                                                        const val = contractor[key];
                                                        return sum + (typeof val === "number" ? val : 0);
                                                    }, 0);

                                                return (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            <a className="text-gray-800 text-hover-primary mb-1">
                                                                {contractor.ContractorName}{" "}
                                                                <span className="text-primary fw-bold">
                                                                    ({totalCount})
                                                                </span>
                                                            </a>
                                                        </td>

                                                        {Object.keys(contractor)
                                                            .filter((key) => key !== "ContractorName")
                                                            .map((dayKey, colIdx) => (
                                                                <td key={colIdx}>
                                                                    {contractor[dayKey] === null ? "-" : contractor[dayKey]}
                                                                </td>
                                                            ))}
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="100%" className="text-center">
                                                    <p>No Data Available</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="d-block d-md-none">
                        {dataLoading ? (
                            <div className="text-center my-4">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : clAttendance && clAttendance.length > 0 ? (
                            clAttendance.map((contractor, index) => {
                                // ✅ Calculate total count
                                const totalCount = Object.keys(contractor)
                                    .filter((key) => key !== "ContractorName")
                                    .reduce((sum, key) => {
                                        const val = contractor[key];
                                        return sum + (typeof val === "number" ? val : 0);
                                    }, 0);

                                return (
                                    <div key={index} className="card mb-3 shadow-sm p-3 text-center">
                                        <h5 className="fw-bold text-primary mb-3">
                                            {index + 1}. {contractor.ContractorName}{" "}
                                            <span className="text-dark fw-semibold">({totalCount})</span>
                                        </h5>

                                        <div className="d-flex flex-wrap justify-content-center">
                                            {Object.keys(contractor)
                                                .filter((key) => key !== "ContractorName")
                                                .map((dayKey, idx) => {
                                                    const dayNumber = idx + 1;
                                                    const dateObj = new Date(selectedYear, selectedMonth - 1, dayNumber);
                                                    const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
                                                    const isSunday = dateObj.getDay() === 0;

                                                    return (
                                                        <div
                                                            key={idx}
                                                            className={`border rounded p-2 m-1 ${isSunday ? "bg-light text-danger border-danger" : ""
                                                                }`}
                                                            style={{ minWidth: "90px" }}
                                                        >
                                                            <div
                                                                className={`fw-semibold ${isSunday ? "text-danger" : "text-muted"
                                                                    }`}
                                                            >
                                                                {`Day-${dayNumber} (${weekday})`}
                                                            </div>
                                                            <div
                                                                className={`fs-6 fw-bold ${isSunday ? "text-danger" : "text-dark"
                                                                    }`}
                                                            >
                                                                {contractor[dayKey] ?? "-"}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center text-muted my-4">
                                <p>No Data Available</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>

        </Base1>
    )
}