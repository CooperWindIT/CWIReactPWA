import React, { useEffect, useState, useRef, useCallback } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import { fetchWithAuth } from "../../utils/api";
import PropTypes from "prop-types";
import { Switch, Tooltip } from "antd";

export default function AddAlert({ machineId, versionId, deptId, entityType }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [usersData, setUsersData] = useState([]);
    const [machinesData, setMachinesData] = useState([]);
    const [documentsData, setDocumentsData] = useState([]);
    const [alertTypesData, setAlertTypesData] = useState([]);
    const [machineCheckMessage, setMachineCheckMessage] = useState("");
    const [modulesData, setModulesData] = useState([]);
    const [alertDates, setAlertDates] = useState([]); // holds generated alert dates
    const [masterName, setMasterName] = useState('');
    const [machineIsMaint, setMachineIsMaint] = useState(false);
    const [machineIsMaintCheck, setMachineIsMaintCheck] = useState(null);
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const { Option } = Select;
    const offcanvasRef = useRef(null);

    const [formData, setFormData] = useState({
        OrgId: "",
        AlertTypeId: null,
        TableId: null,
        PocId: null,
        AlertTitle: null,
        Message: null,
        OcurrenceType: null,
        ScheduledDate: null,
        DaysOfWeek: null,
        DayOfMonth: null,
        ToUsers: null,
        StartDate: null,
        EndDate: null,
        CreatedBy: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }

        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        setSessionModuleId(moduleId);
    }, []);

    useEffect(() => {
        if (machineId && machineId !== 0 && machinesData?.length > 0 && sessionModuleId == 14) {
            const selectedMachine = machinesData.find(mcn => mcn.ItemId == machineId);

            if (selectedMachine) {
                setMasterName(selectedMachine.ItemValue || '');
            }
        }
    }, [machineId, machinesData]);

    useEffect(() => {
        if (machineId && machineId !== 0 && documentsData?.length > 0 && sessionModuleId == 15) {
            const selectedMachine = documentsData.find(mcn => mcn.ItemId == machineId);
            setMachineIsMaint(true)

            if (selectedMachine) {
                setMasterName(selectedMachine.ItemValue || '');
            }
        }
    }, [machineId, documentsData]);

    const fetchDDLData = async () => {
        try {
            const cachedDDL = sessionStorage.getItem("sessionAddMasterAlertDDL");

            if (cachedDDL) {
                const parsed = JSON.parse(cachedDDL);

                setModulesData(parsed.modules || []);
                setMachinesData(parsed.machines || []);
                setDocumentsData(parsed.docs || []);
                setUsersData(parsed.users || []);
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

            const modules = data.ResultData.filter(
                (item) => item.DDLName === "Modules"
            );

            const machines = data.ResultData.filter(
                (item) => item.DDLName === "Machines"
            );

            const users = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            const docs = data.ResultData.filter(
                (item) => item.DDLName === "Documents"
            );

            // 4️⃣ Set state
            setModulesData(modules || []);
            setMachinesData(machines || []);
            setDocumentsData(docs || []);
            setUsersData(users || []);

            // 5️⃣ Save to session storage
            sessionStorage.setItem(
                "sessionAddMasterAlertDDL",
                JSON.stringify({
                    modules,
                    machines,
                    docs,
                    users,
                })
            );

            console.log("DDL fetched from API and cached");

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setModulesData([]);
            setMachinesData([]);
            setUsersData([]);
            setDocumentsData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData && sessionUserData?.OrgId) {
            fetchDDLData();
        }
    }, [sessionUserData]);

    const fetchContentTypes = useCallback(async () => {
        try {
            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString();

            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=${moduleId == 15 ? 0 : deptId}&ModuleId=${moduleId}&TypeCategory=3`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");
            const data = await response.json();
            setAlertTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setAlertTypesData([]);
        }
    }, [deptId, sessionUserData]); // Dependencies

    const fetchMaintCheck = useCallback(async () => {
        if (sessionUserData?.OrgId && machineId && sessionModuleId != 15) {
            try {
                const response = await fetchWithAuth(
                    `PMMS/CheckIsMaintainence?MachineId=${machineId}&OrgId=${sessionUserData?.OrgId}`,
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    }
                );

                if (!response.ok) throw new Error("Network response was not ok");
                const data = await response.json();

                if (data.ResultData?.[0]?.ResponseCode === 2000) {
                    setMachineIsMaintCheck(false);
                } else {
                    setMachineIsMaintCheck(true);
                }
                setMachineCheckMessage(data.ResultData || []);

            } catch (error) {
                console.error("Maint Check failed:", error);
                setMachineCheckMessage([]);
            }
        }
    }, [machineId, sessionUserData, sessionModuleId]);

    useEffect(() => {
        const offcanvasEl = offcanvasRef.current;
        if (!offcanvasEl) return;

        const handleOpen = () => {
            fetchMaintCheck();
            fetchContentTypes();
        };

        offcanvasEl.addEventListener("show.bs.offcanvas", handleOpen);

        return () => {
            offcanvasEl.removeEventListener("show.bs.offcanvas", handleOpen);
        };
    }, [fetchMaintCheck, fetchContentTypes]);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (key, value) => {
        setFormData((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (
            !formData?.AlertTypeId ||
            !formData?.AlertTitle ||
            !formData?.Message ||
            // !formData?.ToUsers ||
            // !formData?.PocId ||
            (alertDates.length === 0) // Ensures at least one date is scheduled
        ) {
            Swal.fire({
                title: "Required Fields Missing",
                text: "Please fill in all mandatory fields (Alert Type, Title, POC, To Users, Message, and Dates) before submitting.",
                icon: "warning",
                confirmButtonColor: "#3085d6",
                confirmButtonText: "OK"
            });
            return; // ❌ Stop execution here
        }
        setAddSubmitLoading(true);

        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();

        const moduleLabels = {
            '14': "Asset",
            '15': "Document",
        };

        const paylaod = {
            OrgId: sessionUserData?.OrgId,
            CreatedBy: sessionUserData?.Id,
            JsonInput: {
                Alert: {
                    AlertTypeId: formData?.AlertTypeId,
                    TableId: machineId,
                    VersionId: versionId > 0 ? versionId : 0,
                    ModuleId: moduleId,
                    AlertTitle: formData?.AlertTitle,
                    Message: `${moduleLabels[sessionModuleId] || ""} Name: ${masterName}, ${formData?.Message}`,
                    OcurrenceType: formData?.OcurrenceType,
                    ToUsers: sessionUserData?.Email,
                    StartDate: formData?.StartDate,
                    EndDate: formData?.EndDate,
                    PocId: sessionUserData?.ManagerId,
                    UpcomingMaintenanceDate: machineIsMaint ? alertDates[0].AlertDate : null,
                    EntityType: entityType,
                    IsMaintenance: machineIsMaint ? 1 : 0,
                },
                ScheduledAlerts: alertDates.map(item => ({
                    ScheduledDate: item.AlertDate
                }))
            }
        }

        try {
            const response = await fetchWithAuth(`Portal/ManageAlerts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paylaod),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    Swal.fire({
                        title: "Success",
                        text: "Alert has been added successfully.",
                        icon: "success",
                    }).then(() => {
                        window.location.reload();
                    })
                } else {
                    Swal.fire({
                        title: "Error",
                        text: data.ResultData?.ResultMessage,
                        icon: "error",
                    });
                }
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

    // Get day name (e.g., Monday)
    const getDayName = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { weekday: "long" });
    };

    // Add months helper
    const addMonths = (date, months) => {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    };

    useEffect(() => {
        if (!formData.OcurrenceType) return;

        const { OcurrenceType, StartDate, EndDate, ScheduledDate, DaysOfWeek, DayOfMonth } = formData;
        let generatedDates = [];

        if (OcurrenceType === "1" && ScheduledDate) {
            // Once
            generatedDates = [{ AlertDate: ScheduledDate, Day: getDayName(ScheduledDate) }];
        }

        else if (OcurrenceType === "2" && StartDate && EndDate && DaysOfWeek) {
            // Weekly
            const start = new Date(StartDate);
            const end = new Date(EndDate);
            const selectedDays = DaysOfWeek.split(",").map(Number); // e.g., [2, 4] => Mon, Wed

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayIndex = d.getDay() + 1; // 1=Sunday
                if (selectedDays.includes(dayIndex)) {
                    generatedDates.push({ AlertDate: d.toISOString().split("T")[0], Day: getDayName(d) });
                }
            }
        }

        else if (OcurrenceType === "3" && StartDate && EndDate && DayOfMonth) {
            // Monthly
            const start = new Date(StartDate);
            const end = new Date(EndDate);
            const day = Number(DayOfMonth.split(",")[0]); // only one day

            for (let d = new Date(start); d <= end; d = addMonths(d, 1)) {
                const target = new Date(d.getFullYear(), d.getMonth(), day);
                if (target >= start && target <= end) {
                    generatedDates.push({ AlertDate: target.toISOString().split("T")[0], Day: getDayName(target) });
                }
            }
        }
        else if (OcurrenceType === "6" && StartDate && EndDate && ScheduledDate) {
            const start = new Date(StartDate);
            const end = new Date(EndDate);

            const schedDate = new Date(ScheduledDate);
            const schedDay = schedDate.getDate();
            const schedMonth = schedDate.getMonth(); // 0-indexed

            let year = start.getFullYear();

            while (year <= end.getFullYear()) {
                // Construct alert date with year from loop and day/month from ScheduledDate
                let alertDate = new Date(year, schedMonth, schedDay);

                if (alertDate >= start && alertDate <= end) {
                    const alertDateStr = `${alertDate.getFullYear()}-${String(alertDate.getMonth() + 1).padStart(2, '0')}-${String(alertDate.getDate()).padStart(2, '0')}`;
                    generatedDates.push({
                        AlertDate: alertDateStr,
                        Day: getDayName(alertDate),
                    });
                }

                year += 1; // next year
            }
        }

        else if (["4", "5"].includes(OcurrenceType) && StartDate && EndDate) {
            // Yearly, Quarterly, Half-Yearly
            const start = new Date(StartDate);
            const end = new Date(EndDate);

            const incrementMonths = OcurrenceType === "4" ? 3 : OcurrenceType === "5" ? 6 : 12;

            for (let d = new Date(start); d <= end; d = addMonths(d, incrementMonths)) {
                generatedDates.push({ AlertDate: d.toISOString().split("T")[0], Day: getDayName(d) });
            }
        }
        setAlertDates(generatedDates);
    }, [formData]);

    function formatDateLocal(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function generateMonthlyAlertDates(startDate, endDate, dayOfMonth) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const alerts = [];

        const year = start.getFullYear();
        const startMonth = start.getMonth();
        const endMonth = end.getMonth() + (end.getFullYear() - year) * 12;

        for (let i = startMonth; i <= endMonth; i++) {
            const currentYear = year + Math.floor(i / 12);
            const currentMonth = i % 12;

            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const validDay = Math.min(dayOfMonth, lastDayOfMonth);

            const alertDate = new Date(currentYear, currentMonth, validDay);

            if (alertDate >= start && alertDate <= end) {
                alerts.push({
                    AlertDate: formatDateLocal(alertDate), // ✅ use local date
                    Day: alertDate.toLocaleDateString("en-US", { weekday: "long" }),
                });
            }
        }

        return alerts;
    }

    useEffect(() => {
        if (
            formData?.OcurrenceType === "3" &&
            formData?.StartDate &&
            formData?.EndDate &&
            formData?.DayOfMonth
        ) {
            const day = Number(formData.DayOfMonth.split(",")[0]);
            const dates = generateMonthlyAlertDates(formData.StartDate, formData.EndDate, day);
            setAlertDates(dates);
        }
    }, [formData.StartDate, formData.EndDate, formData.DayOfMonth]);

    useEffect(() => {
        setAlertDates([]);
    }, [formData.OcurrenceType]);

    useEffect(() => {
        if (machineIsMaint) {
            setFormData(prev => ({
                ...prev,
                OcurrenceType: '1',
            }));
        }
    }, [machineIsMaint]);

    const filteredAlertTypes =
        Number(sessionModuleId) === 15
            ? alertTypesData?.filter(item =>
                machineIsMaint === true
                    ? item.DirectAssign === true
                    : item.DirectAssign === false
            )
            : alertTypesData;

    const directAssignType = alertTypesData?.find(
        (item) => item.DirectAssign === true
    );

    useEffect(() => {
        if (sessionModuleId == 15 && machineIsMaint && directAssignType) {
            handleSelectChange("AlertTypeId", directAssignType.Id);
        }
    }, [sessionModuleId, machineIsMaint, directAssignType]);

    return (
        <div
            ref={offcanvasRef}
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAlertAdd"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAlertAdd {
                            width: 50% !important;
                        }
                    }
                        .toggle-switch {
                        position: relative;
                        width: 46px;
                        height: 24px;
                        display: inline-block;
                    }

                    .toggle-switch input {
                        opacity: 0;
                        width: 0;
                        height: 0;
                    }

                    .toggle-switch .slider {
                        position: absolute;
                        cursor: pointer;
                        inset: 0;
                        background-color: #ced4da;
                        border-radius: 50px;
                        transition: background-color 0.25s ease;
                    }

                    .toggle-switch .slider::before {
                        content: "";
                        position: absolute;
                        height: 18px;
                        width: 18px;
                        left: 3px;
                        top: 3px;
                        background-color: white;
                        border-radius: 50%;
                        transition: transform 0.25s ease;
                        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    }

                    .toggle-switch input:checked + .slider {
                        background-color: #198754; /* Bootstrap success */
                    }

                    .toggle-switch input:checked + .slider::before {
                        transform: translateX(22px);
                    }

                    /* Hover effect */
                    .toggle-switch .slider:hover {
                        box-shadow: 0 0 0 4px rgba(25, 135, 84, 0.15);
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Add Alert</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary btn-sm me-2" type="submit" disabled={addSubmitLoading}>
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
                <div className="offcanvas-body" style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                    maxHeight: 'calc(100vh - 100px)'
                }}>
                    {/* {sessionModuleId != 15 && ( */}
                    <div className="d-flex justify-content-end align-items-center gap-2 mb-2">
                        <div className="d-flex align-items-center">
                            <span className="ms-2 fw-semibold">Is {sessionModuleId != 15 ? "Maintenance" : "Expiry"}</span>
                            <Tooltip
                                title="This maintenance option is to create a maintenance alert for assets. Choose this only if creating an alert specifically for maintenance."
                                placement="top"
                                overlayStyle={{ maxWidth: '290px' }} // Keeps the tooltip from becoming too wide
                            >
                                <i className="bi bi-info-circle ms-2 text-primary cursor-help fa-beat-fade" style={{ fontSize: '1rem' }}></i>
                            </Tooltip>
                        </div>
                        <Switch
                            checkedChildren="YES"
                            unCheckedChildren="NO"
                            onChange={(checked) => setMachineIsMaint(checked)}
                            disabled={machineIsMaintCheck}
                            checked={machineIsMaint}
                        />
                    </div>
                    {/* )} */}

                    <div className="row">
                        <div className="col-12 col-md-6 mb-2 position-relative">
                            <label className="form-label">Alert Title <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="AlertTitle"
                                className="form-control"
                                placeholder="Enter title"
                                style={{ height: '2.8rem', width: '100%' }}
                                value={formData.AlertTitle}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Alert Type <span className="text-danger">*</span></label>
                            <Select
                                placeholder="Select Type"
                                showSearch
                                allowClear={sessionModuleId != 15}
                                disabled={sessionModuleId == 15 && machineIsMaint}
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                style={{ height: '2.8rem', width: '100%' }}

                                value={
                                    sessionModuleId == 15 && machineIsMaint
                                        ? directAssignType?.Id   // only force for maintenance
                                        : formData.AlertTypeId
                                }

                                onChange={(value) => handleSelectChange("AlertTypeId", value)}
                            >
                                {filteredAlertTypes?.map((item) => (
                                    <Option key={item.Id} value={item.Id}>
                                        {item.TypeName}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label d-flex align-items-center">
                                Occurrence Type<span className="text-danger me-1">*</span>
                                <Tooltip title="Select how often this event or maintenance task should repeat.">
                                    <i className="bi bi-info-circle text-primary" style={{ cursor: 'help', fontSize: '0.9rem' }}></i>
                                </Tooltip>
                            </label>

                            <Select
                                placeholder="Choose occurrence type"
                                value={formData.OcurrenceType || undefined}
                                onChange={(value) =>
                                    handleInputChange({ target: { name: "OcurrenceType", value } })
                                }
                                style={{ height: "2.8rem", width: "100%" }}
                                allowClear
                                showSearch
                                optionFilterProp="children"
                                disabled={machineIsMaint}
                            >
                                <Option value="1">Once</Option>
                                <Option value="2">Weekly</Option>
                                <Option value="3">Monthly</Option>
                                <Option value="4">Quarterly</Option>
                                <Option value="5">Half-Yearly</Option>
                                <Option value="6">Yearly</Option>
                            </Select>
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label d-flex align-items-center gap-1">
                                POC for Closure
                                <Tooltip title="This is your manager who will be responsible for closing the alert.">
                                    <i
                                        className="bi bi-info-circle text-primary"
                                        style={{ cursor: 'help', fontSize: '0.9rem' }}
                                    ></i>
                                </Tooltip>
                            </label>
                            <Select
                                placeholder="Select Closure"
                                showSearch
                                allowClear
                                filterOption={(input, option) => {
                                    const childrenText = Array.isArray(option?.children)
                                        ? option.children.join("")
                                        : String(option?.children || "");

                                    return childrenText.toLowerCase().includes(input.toLowerCase());
                                }}
                                style={{ height: '2.8rem', width: '100%' }}
                                value={sessionUserData?.ManagerId}
                                onChange={(value) => handleSelectChange("PocId", value)}
                                disabled={sessionUserData?.ManagerId ? true : false}
                            >
                                {usersData?.map((item) => (
                                    <Option
                                        key={item.ItemId}
                                        value={item.ItemId}
                                        label={item.ItemValue}
                                    >
                                        {item.ItemValue} ({item.DisplayValue})
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-12 mb-2">
                            <label className="form-label">Message<span className="text-danger">*</span></label>
                            <textarea
                                name="Message"
                                className="form-control"
                                placeholder="Enter message..."
                                value={formData.Message}
                                onChange={handleInputChange}
                                rows={3}
                                required
                            />
                        </div>
                        <hr className="text-primary mt-4" />

                        {formData?.OcurrenceType && formData?.OcurrenceType !== '1' &&
                            <div className="col-12 col-md-4 mb-2">
                                <label className="form-label">Start Date<span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    name="StartDate"
                                    min={new Date().toISOString().split("T")[0]}
                                    onChange={handleInputChange}
                                />
                            </div>
                        }
                        {formData?.OcurrenceType && formData?.OcurrenceType !== '1' &&
                            <div className="col-12 col-md-4 mb-2">
                                <label className="form-label">End Date<span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    name="EndDate"
                                    min={formData.StartDate}
                                    max={
                                        formData.StartDate && formData.OcurrenceType === "2"
                                            ? new Date(addMonths(new Date(formData.StartDate), 2))
                                                .toISOString()
                                                .split("T")[0]
                                            : formData.StartDate && formData.OcurrenceType === "3"
                                                ? new Date(addMonths(new Date(formData.StartDate), 3))
                                                    .toISOString()
                                                    .split("T")[0]
                                                : formData.StartDate && ["4", "5", "6", "7"].includes(formData.OcurrenceType)
                                                    ? new Date(addMonths(new Date(formData.StartDate), 24))
                                                        .toISOString()
                                                        .split("T")[0]
                                                    : undefined
                                    }
                                    onChange={handleInputChange}
                                />
                            </div>
                        }
                        {formData?.OcurrenceType === '2' &&
                            <div className="col-12 col-md-4 mb-2">
                                <label className="form-label">Days Of Week<span className="text-danger">*</span></label>
                                <Select
                                    placeholder="Select Day"
                                    showSearch
                                    allowClear
                                    mode="multiple"
                                    maxTagCount={2}
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    value={
                                        Array.isArray(formData.DaysOfWeek)
                                            ? formData.DaysOfWeek.map(Number) // already an array → convert to numbers
                                            : formData.DaysOfWeek
                                                ? String(formData.DaysOfWeek)
                                                    .split(",")
                                                    .map((x) => Number(x)) // string → array of numbers
                                                : [] // fallback empty
                                    }
                                    onChange={(value) => {
                                        if (value.length > 2) {
                                            value = value.slice(-2); // keep only last 2 selections
                                        }
                                        handleSelectChange("DaysOfWeek", value.sort((a, b) => a - b).join(","));
                                    }}
                                    style={{ height: '2.8rem', width: '100%' }}
                                >
                                    {[
                                        'Sunday',
                                        'Monday',
                                        'Tuesday',
                                        'Wednesday',
                                        'Thursday',
                                        'Friday',
                                        'Saturday'
                                    ].map((day, index) => (
                                        <Option key={index + 1} value={index + 1}>
                                            {day}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        }
                        {formData?.OcurrenceType === '3' &&
                            <div className="col-12 col-md-4 mb-2">
                                <label className="form-label">
                                    Days Of Month <span className="text-danger">*</span>
                                </label>
                                <Select
                                    mode="multiple"
                                    placeholder="Select days of month"
                                    showSearch
                                    allowClear
                                    maxTagCount={1}
                                    style={{ height: '2.8rem', width: '100%' }}
                                    value={formData.DayOfMonth ? formData.DayOfMonth.split(",") : []} // CSV → array
                                    onChange={(value) => {
                                        // limit to 1 day
                                        if (value.length > 1) {
                                            value = [value[value.length - 1]]; // keep only the last selected
                                        }
                                        handleSelectChange("DayOfMonth", value.join(","));
                                    }}
                                    filterOption={(input, option) =>
                                        String(option?.children ?? "")
                                            .toLowerCase()
                                            .includes(input.toLowerCase())
                                    }
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <Option key={day} value={String(day)}>
                                            {day}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                        }
                        {['1', '6'].includes(formData?.OcurrenceType) &&
                            <div className="col-12 col-md-4 mb-2">
                                <label className="form-label">Schedule Date<span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    name="ScheduledDate"
                                    className="form-control"
                                    style={{ height: '2.8rem', width: '100%' }}
                                    value={formData.ScheduledDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        }
                    </div>
                </div>
            </form>

            <div className="table-responsive mt-3 px-8 pt-3">
                <table className="table table-bordered table-sm">
                    <thead>
                        <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                            <th style={{ width: "70px" }}>S.No</th>
                            <th>Alert Date</th>
                            <th>Day</th>
                        </tr>
                    </thead>
                    <tbody>
                        {alertDates.length > 0 ? (
                            alertDates.map((item, index) => (
                                <tr key={index}>
                                    <td>{index + 1}</td>
                                    <td>
                                        {item.AlertDate
                                            ? item.AlertDate.split("-").reverse().join("-")
                                            : ""}
                                    </td>
                                    <td>{item.Day}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={3} className="text-center text-muted">
                                    No alert dates generated
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}

AddAlert.propTypes = {
    machineId: PropTypes.number.isRequired,
    versionId: PropTypes.number.isRequired,
    DeptId: PropTypes.number.isRequired,
    entityType: PropTypes.string.isRequired,
};