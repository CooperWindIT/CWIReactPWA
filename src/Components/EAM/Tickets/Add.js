import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import { fetchWithAuth } from "../../../utils/api";
import PropTypes from "prop-types";

export default function RegisterTicket({ assetID, assetName, deptId }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [assetsDDL, setAssetsDDL] = useState([]);
    const [machineStatusCheck, setMachineStatusCheck] = useState(false);
    const [ticketCode, setTicketCode] = useState('');
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const { Option } = Select;

    const [formData, setFormData] = useState({
        MachineId: "",
        IssueType: "",
        Description: "",
        Priority: "",
        DueDate: "",
        MachineStatus: "",
        ImageUrl: null,
    });
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (formData.MachineId) {
            const fetchMachineCheck = async () => {
                try {
                    const response = await fetchWithAuth(`PMMS/CheckActiveTickets?MachineId=${formData.MachineId}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data?.ResultData[0]?.Status === 'true') {
                            setMachineStatusCheck(true);
                            setTicketCode(data.ResultData[0]?.TicketCode || '');
                        } else {
                            setMachineStatusCheck(false);
                            setTicketCode('');
                        }
                    } else {
                        console.error('Failed to fetch attendance data:', response.statusText);
                    }
                } catch (error) {
                    console.error('Error fetching attendance data:', error.message);
                }
            };
            fetchMachineCheck();
        }
    }, [formData.MachineId]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Tickets"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchAssetTypes = async () => {
        try {
            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString();
            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=${selectedDeptId}&ModuleId=${moduleId}&TypeCategory=1`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setAssetTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setAssetTypesData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && selectedDeptId) {
            fetchAssetTypes();
        }
    }, [sessionUserData, selectedDeptId]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDDLData();
            setSelectedDeptId(sessionUserData.DeptId);
        }
    }, [sessionUserData]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setFormData((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
        }
    }, []);

    useEffect(() => {
        if (assetID > 0) {
            setFormData((prev) => ({
                ...prev,
                MachineId: assetID,
            }));
        }
    }, [assetID]);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlTicketsAddData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setDepartmentsData(parsed.depts || []);
                return;
            }

            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const departmentsFileredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            setDepartmentsData(departmentsFileredData || []);

            sessionStorage.setItem(
                "ddlTicketsAddData",
                JSON.stringify({
                    depts: departmentsFileredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDepartmentsData([]);
        }
    };

    const fetchAssetsByType = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/getAssetsByType?OrgId=${sessionUserData?.OrgId}&AssetTypeId=${selectedAssetTypeId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setAssetsDDL(data.ResultData || []);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && selectedAssetTypeId) {
            fetchAssetsByType();
        }
    }, [sessionUserData, selectedAssetTypeId]);

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    const handleInputChange = (eOrValue, name) => {
        if (eOrValue?.target) {
            const { name, value, files } = eOrValue.target;

            // 📁 File input validation
            if (name === "ImageUrl" && files?.length > 0) {
                const file = files[0];

                // ❌ size check
                if (file.size > MAX_FILE_SIZE) {
                    Swal.fire({
                        icon: "warning",
                        title: "File too large",
                        text: "Image size must be less than or equal to 2 MB.",
                    });

                    // reset file input
                    eOrValue.target.value = "";
                    return;
                }

                // ✅ valid file
                setFormData((prev) => ({ ...prev, [name]: file }));
                setImagePreview(URL.createObjectURL(file));
                return;
            }

            let formattedValue = value;

            if (name === "IssueType") {
                if (/^[^a-zA-Z]/.test(formattedValue)) return;

                formattedValue =
                    formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1);
            }

            setFormData((prev) => ({ ...prev, [name]: formattedValue }));
        } else if (name) {
            setFormData((prev) => ({ ...prev, [name]: eOrValue }));
        }
    };

    const handlePriorityChange = (priority) => {
        let status = "ACTIVE";

        if (priority === "1") {
            status = "OUTOFSERVICE";
        }

        setFormData((prev) => ({
            ...prev,
            Priority: priority,
            MachineStatus: status, // 🔥 auto-set
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);

        if (!formData.MachineId || !formData.Priority) {
            Swal.fire({
                title: "warning",
                text: "Something went wrong try after some time..!",
                icon: "error",
            });
            setAddSubmitLoading(false);
            return;
        }

        if (!formData.MachineId) {
            Swal.fire({
                icon: "warning",
                title: "Incomplete Details",
                text: "Assset is mandatory.",
                showClass: {
                    popup: "animate__animated animate__shakeX",
                },
            });
            setAddSubmitLoading(false);

            return;
        }

        const currentDate = new Date();
        let daysToAdd = 0;

        switch (formData.Priority) {
            case 1: // Low
                daysToAdd = 7;
                break;
            case 2: // Medium
                daysToAdd = 5;
                break;
            case 3: // High
                daysToAdd = 3;
                break;
            default:
                daysToAdd = 7;
                break;
        }

        const dueDate = new Date(currentDate);
        dueDate.setDate(currentDate.getDate() + daysToAdd);

        // Format to YYYY-MM-DD
        const formattedDueDate = dueDate.toISOString().split("T")[0];
        formData.DueDate = formattedDueDate;

        const formDataPayload = new FormData();

        formDataPayload.append("OrgId", sessionUserData.OrgId);
        formDataPayload.append("Priority", formData.Priority);
        formDataPayload.append("TicketStatus", "NEW");
        formDataPayload.append("UserId", sessionUserData.Id);

        // Append file if present
        if (formData?.ImageUrl instanceof File) {
            formDataPayload.append("ImageUrl", formData.ImageUrl);
        }

        // Append the nested JSON as string
        const jsonData = {
            MachineId: formData.MachineId,
            IssueType: formData.IssueType,
            Description: formData.Description.replace(/\n/g, " ").trim(),
            MachineStatus: formData.MachineStatus,
            DueDate: formData.DueDate,
            DeptId: assetName.length > 1 ? deptId : 0,
        };

        formDataPayload.append("JsonData", JSON.stringify(jsonData));

        try {
            const response = await fetchWithAuth(`file_upload/TicketsWorkFlow`, {
                method: "POST",
                body: formDataPayload,
            });

            const result = await response.json();

            if (result?.success) {
                if (result.data.result[0].ResponseCode === 2001) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Ticket has been raised successfully.",
                        icon: "success",
                    }).then(() => window.location.reload());
                }
            } else {
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData?.ResultMessage || "Something went wrong.",
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
            setAddSubmitLoading(false);
        }
    };

    const priorityOptions = [
        { label: "Low", value: "3" },
        { label: "Medium", value: "2" },
        { label: "High", value: "1" },
    ];

    const showDeptDwn = sessionActionIds?.includes(25);

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAdd"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAdd {
                            width: 40% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Register Ticket</h5>
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-primary btn-sm me-2"
                            type="submit"
                            disabled={addSubmitLoading || machineStatusCheck}>
                            <i className="bi bi-bookmark-check"></i>{addSubmitLoading ? "Submitting..." : "Submit"}
                        </button>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
                    <div className={`alert alert-warning p-2 mb-2 ${machineStatusCheck ? 'd-none' : 'd-block'}`}>
                        ⚠️ Image must be less than 2MB.
                    </div>
                    <div className={`alert alert-danger p-2 mb-2 ${machineStatusCheck ? 'd-block' : 'd-none'}`}>
                        <strong>Note:</strong> A ticket is already raised for this asset with code: <span className="text-primary fw-bold">{ticketCode}</span>
                        <br />
                        Please resolve the existing ticket before raising a new one.
                    </div>
                    <br />
                    <div className="row">
                        {showDeptDwn && assetID === 0 && (
                            <div className="col-12 col-md-6 mb-2 d-flex flex-column">
                                <label className="form-label">
                                    Department<span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    placeholder="Select Department"
                                    className="w-100"
                                    value={selectedDeptId || undefined}
                                    style={{ height: "2.8rem" }}
                                    onChange={(value) => { setSelectedDeptId(value); setSelectedAssetTypeId(null) }}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {departmentsData?.map((dep) => {
                                        // Check if this department matches the logged-in user's department
                                        const isUserDept = dep.ItemId === sessionUserData?.DeptId;

                                        return (
                                            <Option key={dep.ItemId} value={dep.ItemId}>
                                                <div className="d-flex justify-content-between align-items-center w-100">
                                                    <span className={isUserDept ? "fw-bolder text-primary" : ""}>
                                                        {dep.ItemValue}
                                                    </span>
                                                    {isUserDept && (
                                                        <span
                                                            className="badge badge-light-primary fw-bold"
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                        >
                                                            MY DEPT
                                                        </span>
                                                    )}
                                                </div>
                                            </Option>
                                        );
                                    })}
                                </Select>
                            </div>
                        )}
                        {assetID === 0 && (
                            <div className="col-12 col-md-6 mb-2 d-flex flex-column">
                                <label className="form-label">
                                    Asset Type<span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    placeholder="Select Asset Type"
                                    className="w-100"
                                    value={selectedAssetTypeId || undefined}
                                    style={{ height: "2.8rem" }}
                                    onChange={(value) => setSelectedAssetTypeId(value)}
                                    filterOption={(input, option) => {
                                        const text = `${option?.children}`.toLowerCase();
                                        return text.includes(input.toLowerCase());
                                    }}
                                >
                                    {Array.isArray(assetTypesData) && assetTypesData.map((assTyp) => (
                                        <Option key={assTyp.Id} value={assTyp.Id}>
                                            {assTyp.TypeName}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        )}
                        {assetID === 0 && (
                            <div className="col-12 mb-2">
                                <label className="form-label">
                                    Asset <span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    placeholder="Select Asset"
                                    className="w-100"
                                    value={formData.MachineId || undefined}
                                    style={{ height: '2.8rem' }}
                                    onChange={(value) => handleInputChange(value, "MachineId")}

                                    /* Change 1: Add this custom filter logic */
                                    filterOption={(input, option) => {
                                        // This targets the data attributes we'll add to the Option
                                        const name = option.dataName?.toLowerCase() || "";
                                        const code = option.dataCode?.toLowerCase() || "";
                                        const search = input.toLowerCase();
                                        return name.includes(search) || code.includes(search);
                                    }}

                                    disabled={assetID > 0}
                                >
                                    {assetsDDL?.map((mcn, indx) => (
                                        /* Change 2: Pass search metadata as custom props to the Option */
                                        <Option
                                            key={indx}
                                            value={mcn.AssetId}
                                            dataName={mcn.AssetName} // Helper for search
                                            dataCode={mcn.Code}      // Helper for search
                                        >
                                            {mcn.AssetName} : <span className="text-primary fw-bold">{mcn.Code}</span>
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        )}
                        {assetID !== 0 && (
                            <div className="col-12 mb-2">
                                <label className="form-label">
                                    Asset <span className="text-danger">*</span>
                                </label>
                                <input
                                    className="form-control"
                                    type="text"
                                    value={assetName}
                                    readOnly
                                />
                            </div>
                        )}
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Issue Type<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="IssueType"
                                className={`form-control ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                placeholder="Enter issue type"
                                style={{ width: "100%", height: "2.8rem" }}
                                value={formData.IssueType}
                                onChange={handleInputChange}
                                autoComplete="off"
                                max={30}
                                required
                                disabled={machineStatusCheck}
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">
                                Priority <span className="text-danger">*</span>
                            </label>

                            <Select
                                showSearch
                                placeholder="Choose Priority"
                                optionFilterProp="label"
                                style={{ width: "100%", height: "2.8rem" }}
                                value={formData.Priority || undefined}
                                onChange={(value) => handlePriorityChange(value)}
                                options={priorityOptions}
                                disabled={machineStatusCheck}
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">
                                Status <span className="text-danger">*</span>
                            </label>

                            <input
                                type="text"
                                className="form-control cursor-not-allowed"
                                value={
                                    formData.MachineStatus === "OUTOFSERVICE"
                                        ? "Out of Service"
                                        : "Active"
                                }
                                style={{ width: "100%", height: "2.8rem" }}
                                disabled
                                readOnly
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Image</label>
                            <input
                                type="file"
                                name="ImageUrl"
                                className={`form-control ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                style={{ width: "100%", height: "2.8rem" }}
                                onChange={handleInputChange}
                                accept=".jpg,.jpeg,.png"
                                disabled={machineStatusCheck}
                            />
                        </div>
                        <div>
                            <label className="form-label">Description<span className="text-danger">*</span></label>
                            <textarea
                                type="text"
                                name="Description"
                                className={`form-control ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                placeholder="Enter description"
                                value={formData.Description}
                                onChange={handleInputChange}
                                autoComplete="off"
                                rows={4}
                                disabled={machineStatusCheck}
                                required
                            />
                        </div>

                        {imagePreview && (
                            <div className="mt-3">
                                <img
                                    src={imagePreview}
                                    alt="Selected Preview"
                                    className="img-thumbnail"
                                    style={{ maxHeight: "200px", objectFit: "contain" }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}

RegisterTicket.propTypes = {
    assetID: PropTypes.number.isRequired,
    assetName: PropTypes.string,
    deptId: PropTypes.number,
};