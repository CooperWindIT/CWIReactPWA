import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import { Upload, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { fetchWithAuth } from "../../../utils/api";
import { BASE_API } from "../../Config/Config";

export default function MachinesBulkUplaodExcel() {

    const [sessionUserData, setsessionUserData] = useState({});
    const [contractorsData, setContractorsData] = useState([]);
    const [shiftsData, setShiftsData] = useState([]);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [sectionsData, setSectionsData] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState("");
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [excelData, setExcelData] = useState([]);
    const { Option } = Select;

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const fetchDepartmentsData = async () => {
        if (sessionUserData.OrgId) {
            try {
                const response = await fetchWithAuth(`visitor/getDepts?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setDepartmentsData(data.ResultData);
                } else {
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDepartmentsData();
        }
    }, [sessionUserData]);

    const fetchSectionsData = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/GetSections?DeptId=${selectedDeptId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setSectionsData(data.ResultData);
            } else {
                console.error('Failed to fetch suppliers data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching suppliers data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && selectedDeptId) {
            fetchSectionsData();
        }
    }, [selectedDeptId]);

    const uploadProps = {
        beforeUpload: (file) => {
            setFile(file);
            return false; // prevent auto upload
        },
        onRemove: () => {
            setFile(null);
        },
        fileList: file ? [file] : [],
    };

    const handleExcelUpload = (info) => {
        const file = info.file.originFileObj || info.file;
        setFile(file);
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Use first row as headers
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const headers = jsonData[0];       // First row -> column names
            const rows = jsonData.slice(1);    // Remove example row

            // Convert array rows into objects with keys = headers
            const formattedData = rows.map((row) =>
                headers.reduce((acc, key, i) => {
                    acc[key] = row[i] || "";
                    return acc;
                }, {})
            );

            setExcelData(formattedData);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSubmitExcel = async () => {
        if (!file) {
            message.error("Please select a file before submitting!");
            return;
        }
        const formData = new FormData();
        formData.append("OrgId", sessionUserData?.OrgId);
        formData.append("DeptId", selectedDeptId);
        formData.append("SectionId", selectedSectionId);
        formData.append("CreatedBy", sessionUserData?.Id);
        formData.append("file", file);

        try {
            setLoading(true);
            const response = await fetchWithAuth(
                `PMMS/upload-MachineReg-excel`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            if (data?.success) {
                setLoading(false);
                Swal.fire({
                    title: "Success",
                    text: data?.data?.result[0].Message || "Labour added successfully!",
                    icon: "success"
                })
            } else {
                setLoading(false);
                Swal.fire("Error", data?.data?.result[0].Message || "Failed to add labour!", "error");
            }
        } catch (err) {
            setLoading(false);
            console.error("Upload error:", err);
            message.error("Something went wrong!");
        } finally {
            setLoading(false);
            setFile(null);
        }
    };

    const handleClose = () => {
        setSelectedDeptId(null);
        setSelectedSectionId(null);
        setExcelData([]);
    };

    const formatExcelDate = (value) => {
        if (typeof value === "number") {
            const date = XLSX.SSF.parse_date_code(value);
            if (date) {
                const day = String(date.d).padStart(2, "0");
                const month = String(date.m).padStart(2, "0");
                const year = date.y;
                return `${day}-${month}-${year}`;
            }
        }
        return value; // return as-is if not a number
    };

    const handleDownload = async () => {
        try {
            const token = sessionStorage.getItem("accessToken"); // or localStorage
            const response = await fetch(
                `${BASE_API}public//MachineReg_downloadexcel`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`, // send JWT here
                    },
                }
            );

            if (!response.ok) throw new Error("Failed to download file");

            // Get the file blob
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Machine.xlsx`; // give a name
            document.body.appendChild(a);
            a.click();

            // Clean up
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download error:", error);
        }
    };
    
    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightMacBulkUploadExcel"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightMacBulkUploadExcel {
                            width: 60% !important;
                        }

                    }
                `}
            </style>
            <form autoComplete="off">
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Machiens Bulk Uplaod</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <hr />
                <div className="offcanvas-body"
                    style={{
                        marginTop: "-2rem",
                        maxHeight: "calc(100vh - 4rem)",  // take full height minus top offset
                        overflowY: "auto"
                    }}
                >
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
                        <div className="alert alert-warning mb-0 flex-grow-1 w-100">
                            ⚠️ Please select a <strong>Department</strong> and <strong>Section</strong> first.
                            After that, download the Excel template, fill in all the required fields, and then upload the completed file below.
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm btn-light-info border border-info"
                            onClick={handleDownload}
                        >
                            <i className="fa-solid fa-cloud-arrow-down"></i> Download Excel
                        </button>
                    </div>

                    <div className="row align-items-end mt-4">
                        <div className="col-12 col-md-5 mb-2">
                            <label className="form-label">Department <span className="text-danger">*</span></label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Department"
                                className="w-100"
                                value={selectedDeptId || undefined}
                                style={{ width: "100%", height: "2.3rem" }}
                                onChange={(value) => setSelectedDeptId(value)}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {departmentsData?.map((dep) => (
                                    <Option key={dep.Id} value={dep.Id}>
                                        {dep.DeptName}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-12 col-md-4 mb-2">
                            <label className="form-label">Section <span className="text-danger">*</span></label>
                            <Select
                                placeholder="Select Sections"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                value={selectedSectionId || undefined}
                                onChange={(value) => setSelectedSectionId(value)}
                                style={{ width: "100%", height: "2.3rem" }}
                                disabled={!selectedDeptId}
                            >
                                {sectionsData?.map((item) => (
                                    <Option key={item.SectionId} value={item.SectionId}>
                                        {item.SectionName}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <div className="col-12 my-4">
                        <Upload.Dragger
                            {...uploadProps}
                            accept=".xlsx,.xls"
                            beforeUpload={() => false}  // stop auto upload
                            onChange={handleExcelUpload}
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Click or drag Excel file to upload</p>
                            <p className="ant-upload-hint">Supports only .xlsx or .xls</p>
                        </Upload.Dragger>
                    </div>

                    {excelData.length > 0 && (
                        <div className="mt-5">
                            {/* Desktop view: normal table */}
                            <div className="table-responsive d-none d-md-block" style={{ maxHeight: "260px", overflowY: "auto" }}>
                                <table className="table table-bordered table-sm">
                                    <thead>
                                        <tr>
                                            {Object.keys(excelData[0]).map((col, index) => (
                                                <th key={index}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {excelData.map((row, i) => (
                                            <tr key={i}>
                                                {Object.values(row).map((cell, j) => (
                                                    <td key={j}>{formatExcelDate(cell)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile view: cards */}
                            <div className="d-block d-md-none" style={{ maxHeight: "260px", overflowY: "auto" }}>
                                {excelData.map((row, i) => (
                                    <div key={i} className="card mb-2 shadow-sm border">
                                        <div className="card-body p-2">
                                            {Object.entries(row).map(([key, value], j) => (
                                                <p key={j} className="mb-1">
                                                    <strong>{key}: </strong>
                                                    {formatExcelDate(value)}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="d-flex justify-content-end gap-2 mt-2">
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                            disabled={loading}
                            onClick={handleClose}
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={handleSubmitExcel}
                            title={`${!selectedDeptId || !selectedSectionId ? 'Choose all required fileds..' : ''}`}
                            disabled={loading || !selectedDeptId || !selectedSectionId}
                        >
                            Upload
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}