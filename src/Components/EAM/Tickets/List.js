
import React, { useState, useEffect } from "react";
import Base1 from "../../Config/Base1";
import { Popover, Tooltip, Select } from 'antd';
import '../../Config/Pagination.css';
import Swal from 'sweetalert2';
import '../../Config/Loader.css';
import { Link, useNavigate } from "react-router-dom";
import RegisterTicket from "./Add";
import EditTicket from "./Edit";
import AssignTechnician from "./AssignTech";
import CloseTicket from "./CloseTicket";
import { fetchWithAuth } from "../../../utils/api";
import Pagination from "../../Pagination/Pagination";
import { FileTextOutlined } from "@ant-design/icons"; // you can choose any icon you like
import ReactDOM from "react-dom/client";
import TechnicianList from "./Technicians/Tech";


export default function EAMTicketsList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [ticketsData, setTicketsData] = useState([]);
    const [ticketsCache, setTicketsCache] = useState({});
    const [dataLoading, setDataLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [closeData, setCloseData] = useState([]);
    const [ticketData, setTicketData] = useState([]);
    const [openPanelId, setOpenPanelId] = useState(null);
    const [selectedMCNId, setSelectedMCNId] = useState(null);
    const [selectedPrioriy, setSelectedPrioriy] = useState("0");
    const [selectedStatus, setSelectedStatus] = useState(["ALL"]);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [targetAsset, setTargetAsset] = useState({ id: 0, name: "", deptId: 0 });
    const [techniciansData, setTechniciansData] = useState([]);
    const [assetTypeId, setAssetTypeId] = useState(null);
    const [isDirectAssign, setIsDirectAssign] = useState(null);

    const [assetTypesData, setAssetTypesData] = useState([]);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [unitsData, setUnitsData] = useState([]);

    const savedTicketFilters = JSON.parse(
        sessionStorage.getItem("ticketFilters") || "null"
    );

    const savedState = sessionStorage.getItem("ticketFilters");
    const [currentPage, setCurrentPage] = useState(
        savedState
            ? JSON.parse(savedState).currentPage
            : 1
    );
    const [pageSize, setPageSize] = useState(
        savedState?.pageSize || 10
    );

    const [selectedDeptId, setSelectedDeptId] = useState(
        savedTicketFilters?.deptId || sessionUserData?.DeptId || null
    );

    const [selectedUnitId, setSelectedUnitId] = useState(
        savedTicketFilters?.unitId || unitsData[0]?.ItemId || null
    );

    const [selectedFromDt, setSelectedFromDt] = useState(
        savedTicketFilters?.fromDate || "2025-10-01"
    );

    const [selectedToDt, setSelectedToDt] = useState(
        savedTicketFilters?.toDate ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );    

    const [approveSubmitLoading, SetApproveSubmitLoading] = useState(null);
    const [usersData, setUsersData] = useState([]);
    const [selectedDueDate, setSelectedDueDate] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [asetsDDL, setAssetsDDL] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [editTicketId, setEditTicketId] = useState(null);

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

    const fetchTechnicians = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/GetTechniciansByOrgId?OrgId=${sessionUserData.OrgId}&TypeId=${assetTypeId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setTechniciansData(data.ResultData);
            } else {
                console.error('Failed to fetch technicians data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching technicians data:', error.message);
        }
    };

    useEffect(() => {
        if (assetTypeId && isDirectAssign) {
            fetchTechnicians();
        }
    }, [assetTypeId]);

    useEffect(() => {
        if (sessionUserData.OrgId && selectedDeptId) {
            fetchAssetTypes();
        }
    }, [sessionUserData, selectedDeptId]);

    const fetchTickets = async (
        page = 1,
        force = false,
        overrideDeptId = null,
        overrideUnitId = null,
        overridePageSize = null
    ) => {

        if (!sessionUserData?.OrgId) return;

        const deptId = overrideDeptId ?? selectedDeptId;
        const unitId = overrideUnitId ?? selectedUnitId;

        if (!deptId || !unitId) {
            if (force) {
                Swal.fire({
                    icon: "warning",
                    title: "Incomplete Details",
                    text: "Unit and Department are mandatory fields."
                });
            }
            return;
        }

        const finalPageSize = overridePageSize ?? pageSize;

        const cacheKey = `${deptId}-${unitId}-${page}-${finalPageSize}`;

        if (!force && ticketsCache[cacheKey]) {
            setTicketsData(ticketsCache[cacheKey]);
            setCurrentPage(page);
            return;
        }

        setDataLoading(true);

        const payload = {
            ServiceName: "GetTicketsFilter",
            PageNumber: page,
            PageSize: finalPageSize,
            Params: {
                OrgId: sessionUserData.OrgId,
                MachineId: selectedMCNId || 0,
                UserId: 0,
                Status: selectedStatus.includes("ALL")
                    ? "ALL"
                    : selectedStatus.join(","),
                FromDate: selectedFromDt,
                ToDate: selectedToDt,
                AssetTypeId: selectedAssetTypeId || 0,
                Priority: selectedPrioriy || 0,
                UnitId: unitId,
                DeptId: deptId,
                TechId: 0,
            },
        };

        try {
            const response = await fetchWithAuth(`PMMS/GetTicketsFilter`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                const data = await response.json();
                const pageData = data.data.result || [];
                const total = data.data.output.TotalCount || 0;

                setTicketsCache(prev => ({
                    ...prev,
                    [cacheKey]: pageData
                }));

                setTicketsData(pageData);
                setTotalRecords(total);
                setCurrentPage(page);

                sessionStorage.setItem(
                    "ticketFilters",
                    JSON.stringify({
                        deptId,
                        unitId,
                        fromDate: selectedFromDt,
                        toDate: selectedToDt,
                        page,
                        pageSize: finalPageSize
                    })
                );

            } else {
                console.error('Failed to fetch technicians data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching technicians data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (!sessionUserData?.OrgId) return;

        const saved = JSON.parse(
            sessionStorage.getItem("ticketFilters") || "{}"
        );

        if (saved?.deptId && saved?.unitId) {

            // Restore UI states
            setSelectedDeptId(saved.deptId);
            setSelectedUnitId(saved.unitId);
            setSelectedFromDt(saved.fromDate);
            setSelectedToDt(saved.toDate);
            setPageSize(saved.pageSize || 10);

            const restoredPage = saved.page || 1;
            setCurrentPage(restoredPage);

            // 🔥 Important: Pass EVERYTHING explicitly
            fetchTickets(
                restoredPage,
                true,
                saved.deptId,
                saved.unitId,
                saved.pageSize
            );
        }

    }, [sessionUserData?.OrgId]);

    const handleFilterSubmit = () => {

        const ticketFilters = {
            deptId: selectedDeptId,
            unitId: selectedUnitId,
            fromDate: selectedFromDt,
            toDate: selectedToDt,
            assetTypeId: selectedAssetTypeId,
            priority: selectedPrioriy,
            status: selectedStatus,
            page: 1 // ⭐ Reset page when new submit
        };

        sessionStorage.setItem("ticketFilters", JSON.stringify(ticketFilters));

        setTicketsCache({});
        fetchTickets(1, true, selectedDeptId, selectedUnitId);
    };

    useEffect(() => {
        if (!sessionUserData?.OrgId) return;

        fetchDDLData();
        if (!savedTicketFilters) {
            setSelectedDeptId(sessionUserData?.DeptId);
            setSelectedUnitId(unitsData[0]?.ItemId);
        }
    }, [sessionUserData?.OrgId]);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlTicketsListData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                const units = Array.isArray(parsed.units) ? parsed.units : [];

                setDepartmentsData(parsed.depts || []);
                setUnitsData(units);
                setUsersData(parsed.users || []);

                if (units.length > 0) {
                    setSelectedUnitId(units[0].ItemId);
                }

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
                item => item.DDLName === "Departments"
            );

            const usersFilteredData = data.ResultData.filter(
                item => item.DDLName === "Users"
            );

            const unitsFilteredData = data.ResultData.filter(
                item => item.DDLName === "UnitLocations"
            );

            setDepartmentsData(departmentsFileredData || []);
            setUnitsData(unitsFilteredData || []);
            setUsersData(usersFilteredData || []);

            if (unitsFilteredData.length > 0) {
                setSelectedUnitId(unitsFilteredData[0].ItemId);
            }

            sessionStorage.setItem(
                "ddlTicketsListData",
                JSON.stringify({
                    depts: departmentsFileredData,
                    units: unitsFilteredData,
                    users: usersFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDepartmentsData([]);
            setUnitsData([]);
            setUsersData([]);
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

    const handleCloseTicket = (item) => {
        setCloseData(item);
    };

    const handleAssignTech = (item) => {
        setTicketData(item);
    };

    const totalPages = Math.ceil(totalRecords / pageSize);

    const handleDeleteTicket = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete ticket?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                setDeleteLoading(true);
                try {
                    const payload = {
                        UserId: sessionUserData.Id,
                        Id: item.Id,
                    };

                    const response = await fetchWithAuth(`PMMS/InActiveTickets`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        Swal.fire("Success!", "Ticket has been deleted.", "success").then(() => {
                            fetchTickets(currentPage, true);
                            setDeleteLoading(false);
                        });
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete ticket.", "error");
                        setDeleteLoading(false);
                    }
                } catch (error) {
                    console.error("Error during ticket delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                    setDeleteLoading(false);
                }
            }
        });
    };

    const handleApproveClick = (item) => {
        setAssetTypeId(item.TypeId);
        setIsDirectAssign(item.DirectAssign);
        const state = {
            selectedUser: null,
            assignmentType: 'internal' // default type
        };

        Swal.fire({
            title: "Approve Ticket",
            html: `<div id="swal-react-container"></div>`,
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-check2-all me-1"></i> Approve`,
            cancelButtonText: `<i class="bi bi-x-lg me-1"></i> Cancel`,
            width: '500px',
            focusConfirm: false,
            didOpen: () => {
                const container = document.getElementById("swal-react-container");
                const root = ReactDOM.createRoot(container);

                // Create a small internal component for reactivity
                const ApprovalContent = () => {
                    const [type, setType] = React.useState('internal');

                    return (
                        <div style={{ textAlign: "left" }}>
                            <p className="mb-3"><strong>Ticket:</strong> {item?.TicketCode || item?.Col2}</p>

                            {/* 1. Selection Type */}
                            {/* <div className="btn-group w-100 mb-4" role="group">
                                <input type="radio" className="btn-check" name="assignType" id="internal" autoComplete="off"
                                    checked={type === 'internal'} onChange={() => { setType('internal'); state.assignmentType = 'internal'; state.selectedUser = null; }} />
                                <label className="btn btn-outline-primary btn-sm" htmlFor="internal">Internal User</label>

                                <input type="radio" className={`btn-check ${item.DirectAssign ? "d-block" : "d-none"}`} name="assignType" id="external" autoComplete="off"
                                    checked={type === 'external'} onChange={() => { setType('external'); state.assignmentType = 'external'; state.selectedUser = null; }} />
                                <label className={`btn btn-outline-primary btn-sm ${item.DirectAssign ? "d-block" : "d-none"}`} htmlFor="external">External Technician</label>
                            </div> */}

                            {/* 2. Dynamic Dropdown */}
                            <label className="form-label fw-bold">
                                {type === 'internal' ? 'Select Internal Employee' : 'Select External Technician'}
                            </label>

                            {type === 'internal' ? (
                                <Select
                                    showSearch
                                    placeholder="Search Employee..."
                                    className="w-100"
                                    dropdownStyle={{ zIndex: 20000 }}
                                    optionFilterProp="label"
                                    onChange={(id) => {
                                        state.selectedUser = usersData.find((u) => u.ItemId === id);
                                    }}
                                    options={usersData.map(user => ({
                                        label: user.ItemValue,
                                        value: user.ItemId,
                                    }))}
                                />

                            ) : (
                                <div className="d-flex gap-2">
                                    <Select
                                        showSearch
                                        placeholder="Search Technician..."
                                        className="flex-grow-1"
                                        dropdownStyle={{ zIndex: 20000 }}
                                        onChange={(id) => {
                                            // Mapping technician data to match the expected 'selectedUser' structure
                                            const tech = techniciansData.find((t) => t.Id === id);
                                            state.selectedUser = tech ? { Name: tech.Name, Email: tech.Email || '', Id: tech.Id } : null;
                                        }}
                                    >
                                        {techniciansData?.map((tech) => (
                                            <Option key={tech.Id} value={tech.Id}>{tech.Name}</Option>
                                        ))}
                                    </Select>
                                    {/* <button type="button" className="btn btn-secondary" onClick={() => setShowModal(true)}>+</button> */}
                                </div>
                            )}
                        </div>
                    );
                };

                root.render(<ApprovalContent />);
            },
            preConfirm: () => {
                if (!state.selectedUser) {
                    Swal.showValidationMessage(`Please select a ${state.assignmentType === 'internal' ? 'user' : 'technician'}!`);
                    return false;
                }
                return { user: state.selectedUser, type: state.assignmentType };
            },
        }).then((result) => {
            if (result.isConfirmed) {
                // Pass the selected user and the type to the submit function
                handleApproveSubmit(result.value.user, item, result.value.type);
                console.log(result.value.user, item, result.value.type)
            }
        });
    };

    const handleApproveSubmit = async (selectedUser, item, assignmentType) => {
        SetApproveSubmitLoading(true);
        console.log(selectedUser)

        Swal.fire({
            title: 'Confirm Approval',
            text: `Assigning ${selectedUser.Name || selectedUser.ItemValue} to Ticket ${item.TicketCode}. Proceed?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Proceed',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    let formPayload = {};

                    if (assignmentType === 'external') {
                        // --- EXTERNAL PAYLOAD ---
                        formPayload = {
                            OrgId: sessionUserData?.OrgId,
                            Priority: item.Priority,
                            TicketStatus: "ASSIGNED", // Changed for external
                            TicketId: item?.Id,
                            UserId: sessionUserData?.Id,
                            JsonData: {
                                TechnicianId: selectedUser.Id, // From External selection
                                TicketCode: item.TicketCode,
                                MachineId: item.MachineId
                            }
                        };
                    } else {
                        // --- INTERNAL PAYLOAD ---
                        formPayload = {
                            OrgId: sessionUserData?.OrgId,
                            Priority: item.Priority,
                            TicketStatus: "APPROVED", // Changed for internal
                            TicketId: item?.Id,
                            UserId: sessionUserData?.Id,
                            JsonData: {
                                MachineId: item.MachineId,
                                TicketCode: item.TicketCode,
                                AssignedEmail: selectedUser.Email,
                                AssignedUser: selectedUser.Name || selectedUser.ItemValue,
                                DueDate: item.DueDate || selectedDueDate,
                                AssignedId: selectedUser.ItemId
                            }
                        };
                    }

                    const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formPayload),
                    });

                    const resultData = await response.json();

                    if (resultData.success) {
                        Swal.fire("Success", "Ticket processed successfully", "success")
                            .then(() => fetchTickets(1, true));
                    } else {
                        throw new Error(resultData?.ResultData?.ResultMessage || "Submission failed");
                    }

                } catch (error) {
                    console.error("Submission error:", error);
                    Swal.fire("Error", error.message, "error");
                } finally {
                    SetApproveSubmitLoading(false);
                }
            } else {
                SetApproveSubmitLoading(false);
            }
        });
    };

    const handleReject = (item) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to reject ticket: ${item?.Col2 || item?.TicketCode || item?.Id}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-ban text-white me-1"></i>Yes, Reject`,
            cancelButtonText: `<i class="bi bi-x-lg text-white me-1"></i>No`,
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const formPayload = {
                        OrgId: sessionUserData?.OrgId,
                        Priority: item.Priority,
                        TicketStatus: "REJECTED",
                        TicketId: item?.Id,
                        UserId: sessionUserData?.Id,
                        JsonData: {
                            MachineId: item.MachineId,
                            TicketCode: item.TicketCode,
                        }
                    };

                    const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formPayload),
                    });

                    const resultData = await response.json();
                    const resultItem = resultData?.data?.result?.[0];

                    if (resultItem?.ResponseCode === 2004) {
                        Swal.fire({
                            title: "Success",
                            text: resultItem.Subject || "Ticket has been rejected successfully.",
                            icon: "success",
                        }).then(() => fetchTickets(1, true));

                    } else {
                        Swal.fire({
                            title: "Error",
                            text: resultItem?.ResultMessage || "Reject failed.",
                            icon: "error",
                        });
                    }

                } catch (error) {
                    console.error("Reject error:", error);
                    Swal.fire({
                        title: "Error",
                        text: "Something went wrong while rejecting the ticket.",
                        icon: "error",
                    });
                }
            }
        });
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "new":
                return "badge-light-primary";
            case "assigned":
                return "badge-light-success";
            case "approved":
                return "badge-light-danger";
            case "closed":
                return "badge-light-success";
            case "tech_fixed":
                return "badge-light-info";
            case "pending_with_client":
                return "badge-light-warning";
            case "resolved":
                return "badge-light-primary";
            case "req approval":
                return "badge-light-info";
            case "req approved":
                return "badge-light-info";
            case "filesupload":
                return "badge-light-info";
            default:
                return "badge-light";
        }
    };

    const togglePanel = (id) => {
        setOpenPanelId((prevId) => (prevId === id ? null : id));
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB").replace(/\//g, "-");
    };

    const permissionsByStatus = {
        edit: ["CLOSED"],
        delete: ["NEW", "MODIFIED", "REJECTED"],
        approve: ["NEW", "REJECTED", "MODIFIED"],
        reject: ["NEW", "MODIFIED"],
        assignTech: ["NEW", "APPROVED"],
        close: ["RESOLVED"],
    };

    function getAgingStatus(dueDateString, status, updatedOn) {
        if (!dueDateString) return "-";

        const dueDate = new Date(dueDateString);
        const today = new Date();

        // Normalize times to midnight for accuracy
        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        // Calculate difference in days
        const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        // 🟢 If ticket is closed
        if (status === "CLOSED" && updatedOn) {
            const closedDate = new Date(updatedOn);
            closedDate.setHours(0, 0, 0, 0);
            const closeDiffDays = Math.floor((closedDate - dueDate) / (1000 * 60 * 60 * 24));

            const closedDateStr = closedDate.toLocaleDateString("en-GB"); // dd/mm/yyyy

            if (closeDiffDays > 0)
                return `Closed on ${closedDateStr} (${closeDiffDays} day${closeDiffDays > 1 ? "s" : ""} late)`;
            else if (closeDiffDays === 0)
                return `Closed on ${closedDateStr} (on time)`;
            else
                return `Closed on ${closedDateStr} (${Math.abs(closeDiffDays)} day${Math.abs(closeDiffDays) > 1 ? "s" : ""} early)`;
        }

        // 🟡 If ticket is open
        if (diffDays < 0)
            return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} left`;
        else if (diffDays === 0)
            return "Due Today";
        else
            return `${diffDays} day${diffDays > 1 ? "s" : ""} overdue`;
    };

    const statusOptions = [
        { value: "ALL", label: "All" },
        { value: "NEW", label: "New" },
        { value: "APPROVED", label: "Approved" },
        { value: "REJECTED", label: "Rejected" },
        { value: "PENDING_WITH_CLIENT", label: "Pending With Client" },
        { value: "RESOLVED", label: "Resolved" },
        { value: "CLOSED", label: "Closed" },
        // { value: "MODIFIED", label: "Modified" },
        // { value: "REQ APPROVAL", label: "REQ-Approval" },
        // { value: "REQ APPROVED", label: "REQ-Approved" },
    ];

    const handleStatusChange = (values) => {
        // If selecting ALL, force only ALL
        if (values.includes("ALL")) {
            setSelectedStatus(["ALL"]);
        }
        // When user selects other statuses, remove ALL
        else {
            setSelectedStatus(values);
        }
    };

    const showAddBtn = sessionActionIds?.includes(1);
    const showViewBtn = sessionActionIds?.includes(2);
    const showEditBtn = sessionActionIds?.includes(3);
    const showApproveBtn = sessionActionIds?.includes(4);
    const showRejectBtn = sessionActionIds?.includes(5);
    const showAssignTechBtn = sessionActionIds?.includes(8);
    const showCloseBtn = sessionActionIds?.includes(10);
    const showDeleteBtn = sessionActionIds?.includes(11);
    const showDeptDwn = sessionActionIds?.includes(25);


    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">
                            Tickets List
                        </h1>

                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Tickets</li>
                        </ul>
                    </div>

                    <div className="bg-white p-2 rounded-3 shadow-sm border d-flex flex-wrap align-items-center gap-2">
                        <a
                            className="btn btn-info btn-sm shadow-sm custom-btn"
                            data-bs-toggle="offcanvas"
                            data-bs-target="#offcanvasRightTech"
                            aria-controls="offcanvasRightTech"
                        >
                            <i className="fa-solid fa-user-gear"></i><span className="d-none d-md-inline">Technicians</span>
                        </a>
                        {showAddBtn && (
                            <a
                                className="btn btn-primary btn-sm shadow-sm custom-btn"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAdd"
                                aria-controls="offcanvasRightAdd"
                                onClick={() => setTargetAsset({ id: 0, name: "", deptId: 0 })}
                            >
                                <i className="fa-solid fa-ticket"></i><span className="d-none d-md-inline">Raise Ticket</span>
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className={`app-content flex-column-fluid pt-2 ${deleteLoading ? 'blurred' : ''}`}>
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card mb-3 shadow-sm">
                        <div className="p-2">
                            <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 border-bottom pb-3">
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-filter-right fs-2 text-primary me-2"></i>
                                    <h5 className="text-gray-800 fw-bolder mb-0">
                                        Filter Parameters
                                    </h5>
                                </div>
                                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0" title="Coming soon..">
                                    <span className="text-muted fw-semibold">Show</span>
                                    <Select
                                        value={pageSize}
                                        style={{ width: 80 }}
                                        size="small"
                                        onChange={(value) => {
                                            setPageSize(value);
                                            setCurrentPage(1);

                                            const saved = JSON.parse(
                                                sessionStorage.getItem("assetListState") || "{}"
                                            );

                                            sessionStorage.setItem(
                                                "assetListState",
                                                JSON.stringify({
                                                    ...saved,
                                                    page: 1,
                                                    pageSize: value
                                                })
                                            );

                                            fetchTickets(
                                                1,
                                                true,
                                                selectedDeptId,
                                                selectedUnitId,
                                                value
                                            );
                                        }}
                                        options={[
                                            { value: 10, label: "10" },
                                            { value: 50, label: "50" },
                                            { value: 100, label: "100" }
                                        ]}
                                    />
                                    <span className="text-muted fw-semibold">
                                        entries
                                    </span>
                                </div>
                            </div>
                            <div className="row d-flex justify-content-start align-items-end">
                                <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label">From<span className="text-danger">*</span></label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={selectedFromDt}
                                        onChange={(e) => setSelectedFromDt(e.target.value)}
                                        style={{ height: '2.6rem' }}
                                    />
                                </div>
                                <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label">To<span className="text-danger">*</span></label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={selectedToDt}
                                        onChange={(e) => setSelectedToDt(e.target.value)}
                                        style={{ height: '2.6rem' }}
                                    />
                                </div>

                                <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label">
                                        Unit<span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        showSearch
                                        placeholder={!unitsData ? "Loading..." : "Select Unit"}
                                        className="w-100"
                                        loading={unitsData.length === 0}

                                        // Change 2: Only show the ID if the data has actually arrived
                                        value={(unitsData.length > 0) ? (selectedUnitId || undefined) : undefined}
                                        style={{ height: '2.6rem' }}
                                        onChange={(value) => setSelectedUnitId(value)}
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                        disabled={!unitsData || !showDeptDwn}
                                    >
                                        <Option value="0">ALL</Option>
                                        {unitsData?.map((unt) => (
                                            <Option key={unt.ItemId} value={unt.ItemId}>
                                                {unt.DisplayValue}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label">
                                        Department<span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        showSearch
                                        placeholder={!unitsData ? "Loading..." : "Select Department"}
                                        className="w-100"
                                        loading={departmentsData.length === 0}

                                        // Change 2: Only show the ID if the data has actually arrived
                                        value={(departmentsData.length > 0) ? (selectedDeptId || undefined) : undefined}
                                        style={{ height: "2.6rem" }}
                                        onChange={(value) => setSelectedDeptId(value)}
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                        disabled={!departmentsData || !showDeptDwn}
                                    >
                                        <Option value="0">ALL</Option>
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

                                <div className="col-12 col-md-3 mb-2 d-flex flex-column">
                                    <label className="form-label">
                                        Asset Type
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select Asset Type"
                                        className="w-100"
                                        value={selectedAssetTypeId || undefined}
                                        style={{ height: "2.6rem" }}
                                        onChange={(value) => setSelectedAssetTypeId(value)}
                                        filterOption={(input, option) => {
                                            const text = `${option?.children}`.toLowerCase();
                                            return text.includes(input.toLowerCase());
                                        }}
                                    >
                                        <Option value="0">ALL</Option>
                                        {Array.isArray(assetTypesData) && assetTypesData.map((assTyp) => (
                                            <Option key={assTyp.Id} value={assTyp.Id}>
                                                {assTyp.TypeName}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-4 mb-2 d-flex flex-column">
                                    <label className="form-label">
                                        Asset
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select Asset"
                                        className="w-100"
                                        value={selectedMCNId}
                                        style={{ height: '2.6rem' }}
                                        onChange={(value) => setSelectedMCNId(value)}
                                        optionFilterProp="children"
                                        filterOption={(input, option) => {
                                            const getChildText = (children) => {
                                                if (Array.isArray(children)) {
                                                    return children.map(getChildText).join("");
                                                }
                                                if (typeof children === "object" && children?.props?.children) {
                                                    return getChildText(children.props.children);
                                                }
                                                return String(children || "");
                                            };

                                            const searchableText = getChildText(option.children).toLowerCase();
                                            return searchableText.includes(input.toLowerCase());
                                        }}
                                    >
                                        {asetsDDL?.map((mcn, indx) => (
                                            <Option key={indx} value={mcn.AssetId}>
                                                {mcn.AssetName} : <span className="text-primary fw-bold">{mcn.Code}</span>
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label">Priority</label>
                                    <Select
                                        showSearch
                                        placeholder="Select Priority"
                                        optionFilterProp="label"
                                        value={selectedPrioriy}
                                        onChange={(value) => setSelectedPrioriy(value)}
                                        style={{ width: "100%", height: "2.6rem" }}
                                        options={[
                                            { value: "0", label: "All" },
                                            { value: "3", label: "Low" },
                                            { value: "2", label: "Medium" },
                                            { value: "1", label: "High" },
                                        ]}
                                    />
                                </div>
                                <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label">Status</label>
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        placeholder="Select Status"
                                        style={{ width: "100%", height: "2.6rem" }}
                                        value={selectedStatus}
                                        onChange={handleStatusChange}
                                        maxTagCount="responsive"
                                        options={statusOptions.map(opt => {
                                            const isAllSelected = selectedStatus.includes("ALL");
                                            const hasOtherSelected = selectedStatus.length > 0 && !isAllSelected;
                                            return {
                                                ...opt,
                                                disabled:
                                                    (isAllSelected && opt.value !== "ALL") ||
                                                    (hasOtherSelected && opt.value === "ALL"),
                                            };
                                        })}
                                    />
                                </div>
                                <div className="col-auto mb-2 d-flex">
                                    <button
                                        className="btn btn-light-primary btn-sm border border-primary w-100 w-md-auto"
                                        type="button"
                                        style={{ height: "2.6rem", fontSize: "0.9rem" }}
                                        onClick={handleFilterSubmit}
                                        disabled={dataLoading}
                                    >
                                        <i className="bi bi-filter-circle"></i>{dataLoading ? 'Submitting...' : 'Submit'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card d-md-block d-none mt-1 mb-10 shadow-sm">
                        <div className="table-responsive">
                            <table className="table align-middle table-hover gs-7 gy-5 mb-0 fs-6">
                                <thead className="bg-light-primary">
                                    <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom-2 border-primary">
                                        <th className="">S.No</th>
                                        <th className="min-w-125px">Ticket Code</th>
                                        <th className="min-w-125px">Asset</th>
                                        <th className="min-w-125px">Created On</th>
                                        <th className="min-w-205px">Technician</th>
                                        <th className="min-w-100px">Priority</th>
                                        <th className="min-w-100px">Status</th>
                                        {/* <th className="min-w-100px">Updated On</th> */}
                                        <th className="min-w-100px">Aging</th>
                                        <th className="min-w-100px text-center">Last Log</th>
                                        <th className="">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-semibold text-gray-700">
                                    {dataLoading ? (
                                        <tr>
                                            <td colSpan="12" className="text-center">
                                                <div className="container"></div>
                                            </td>
                                        </tr>
                                    ) : ticketsData && ticketsData?.length > 0 ? (
                                        ticketsData?.map((item, index) => {
                                            const canEdit = showEditBtn && !permissionsByStatus.edit.includes(item.Status);
                                            const canDelete = showDeleteBtn && permissionsByStatus.delete.includes(item.Status);
                                            const canApprove = showApproveBtn && permissionsByStatus.approve.includes(item.Status);
                                            const canReject = showRejectBtn && permissionsByStatus.reject.includes(item.Status);
                                            // const canAssignTech = permissionsByStatus.assignTech.includes(item.Status);
                                            const canAssignTech = (showAssignTechBtn) && (
                                                // Case 1: Status is NEW and DirectAssign is true
                                                (item.Status === 'NEW' && item.DirectAssign === true) ||

                                                // Case 2: Status is APPROVED (DirectAssign is ignored)
                                                (item.Status === 'APPROVED') ||

                                                // Case 3: Fallback for any other statuses defined in your permissions array
                                                (!['NEW', 'APPROVED'].includes(item.Status) && permissionsByStatus.assignTech.includes(item.Status))
                                            );
                                            const canClose = showCloseBtn && permissionsByStatus.close.includes(item.Status);
                                            const canView = showViewBtn;
                                            return (
                                                <tr
                                                    key={index}
                                                    className="shadow-sm rounded-3"
                                                    style={{
                                                        transition: "all 0.2s ease-in-out",
                                                    }}
                                                >
                                                    <td className="text-muted">
                                                        {(currentPage - 1) * pageSize + index + 1}
                                                    </td>
                                                    <td>
                                                        <Link to={`/eam/ticket-view/${item.OrgId}/${item.Id}`} className="text-dark fw-bold text-hover-primary mb-1 badge badge-light-primary">{item.TicketCode}</Link>
                                                    </td>
                                                    <td>
                                                        <Tooltip
                                                            title={item.MachineName}
                                                            placement="topLeft"
                                                            color="blue"
                                                        >
                                                            <Link
                                                                to={`/eam/ticket-view/${item.OrgId}/${item.Id}`}
                                                                className="fw-bold text-primary"
                                                                style={{
                                                                    display: "inline-block",
                                                                    maxWidth: "180px",
                                                                    whiteSpace: "nowrap",
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    verticalAlign: "middle",
                                                                }}
                                                            >
                                                                {item.MachineName}
                                                            </Link>
                                                        </Tooltip>
                                                    </td>
                                                    <td>{formatDate(item.CreatedOn) || 'N/A'}</td>
                                                    <td>{item.Technician || 'N/A'}</td>
                                                    <td>
                                                        {item.Priority === 1 && (
                                                            <span className="badge badge-light-danger">High</span>
                                                        )}
                                                        {item.Priority === 2 && (
                                                            <span className="badge badge-light-warning">Medium</span>
                                                        )}
                                                        {item.Priority === 3 && (
                                                            <span className="badge badge-light-primary">Low</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(item.Status)}`}>
                                                            {item.Status}
                                                        </span>
                                                    </td>
                                                    {/* <td>
                                                        {formatDate(item.UpdatedOn)}
                                                    </td> */}
                                                    <td className="text-info">
                                                        <Tooltip
                                                            title={getAgingStatus(item.DueDate, item.Status, item.UpdatedOn)}
                                                            placement="topLeft"
                                                            color="blue"
                                                        >
                                                            <span
                                                                 style={{
                                                                    display: "inline-block",
                                                                    maxWidth: "100px",
                                                                    whiteSpace: "nowrap",
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    verticalAlign: "middle",
                                                                }}
                                                            >
                                                                {getAgingStatus(item.DueDate, item.Status, item.UpdatedOn)}
                                                            </span>
                                                        </Tooltip>
                                                    </td>
                                                    <td className="text-center">
                                                        {item.StatusLogs ? (
                                                            <Popover
                                                                content={
                                                                    <div style={{ maxWidth: 250, whiteSpace: "pre-wrap" }}>
                                                                        {item.StatusLogs}
                                                                    </div>
                                                                }
                                                                title="Messaege"
                                                                trigger="hover"
                                                            >
                                                                <Tooltip >
                                                                    <FileTextOutlined style={{ fontSize: 18, color: "#1890ff", cursor: "pointer" }} />
                                                                </Tooltip>
                                                            </Popover>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </td>
                                                    <td>
                                                        <Popover
                                                            placement="bottom"
                                                            content={
                                                                <div style={{ width: '8rem' }}>
                                                                    <p
                                                                        style={{
                                                                            cursor: canView ? 'pointer' : 'not-allowed',
                                                                            opacity: canView ? 1 : 0.5,
                                                                            pointerEvents: canView ? 'auto' : 'none',
                                                                            filter: canView ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-primary"
                                                                    >
                                                                        <Link to={`/eam/ticket-view/${item.OrgId}/${item.Id}`}>
                                                                            <i className="fa-regular fa-eye me-2"></i>
                                                                            View
                                                                        </Link>
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            cursor: canEdit ? 'pointer' : 'not-allowed',
                                                                            opacity: canEdit ? 1 : 0.5,
                                                                            pointerEvents: canEdit ? 'auto' : 'none',
                                                                            filter: canEdit ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-primary"
                                                                        onClick={() => {setIsModalOpen(true); setEditTicketId(item.Id)}}
                                                                    >
                                                                        <i className="fa-regular fa-pen-to-square me-2 text-info"></i>
                                                                        Edit
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            cursor: (canApprove && !item.DirectAssign) ? 'pointer' : 'not-allowed',
                                                                            opacity: (canApprove && !item.DirectAssign) ? 1 : 0.5,
                                                                            pointerEvents: (canApprove && !item.DirectAssign) ? 'auto' : 'none',
                                                                        }}
                                                                        className="text-hover-primary"
                                                                        onClick={() => handleApproveClick(item)}
                                                                    >
                                                                        <i className="fa-solid fa-check text-success me-2"></i>
                                                                        Approve
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            cursor: canReject ? 'pointer' : 'not-allowed',
                                                                            opacity: canReject ? 1 : 0.5,
                                                                            pointerEvents: canReject ? 'auto' : 'none',
                                                                            filter: canReject ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-primary"
                                                                        onClick={() => canReject && handleReject(item)}
                                                                    >
                                                                        <i className="fa-solid fa-ban me-2 text-danger"></i>
                                                                        Reject
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            cursor: (canAssignTech) ? 'pointer' : 'not-allowed',
                                                                            opacity: (canAssignTech) ? 1 : 0.5,
                                                                            pointerEvents: (canAssignTech) ? 'auto' : 'none',
                                                                            filter: (canAssignTech) ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-primary"
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightAssignTech"
                                                                        aria-controls="offcanvasRightAssignTech"
                                                                        onClick={() => (canAssignTech) && handleAssignTech(item)}
                                                                    >
                                                                        <i className="fa-solid fa-user-nurse text-primary me-2"></i>
                                                                        Assign Tech
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            cursor: canClose ? 'pointer' : 'not-allowed',
                                                                            opacity: canClose ? 1 : 0.5,
                                                                            pointerEvents: canClose ? 'auto' : 'none',
                                                                            filter: canClose ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-primary"
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightCloseTic"
                                                                        aria-controls="offcanvasRightCloseTic"
                                                                        onClick={() => canClose && handleCloseTicket(item)}
                                                                    >
                                                                        <i className="fa-solid fa-clipboard-check text-success me-2"></i>
                                                                        Close
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            cursor: canDelete ? 'pointer' : 'not-allowed',
                                                                            opacity: canDelete ? 1 : 0.5,
                                                                            pointerEvents: canDelete ? 'auto' : 'none',
                                                                            filter: canDelete ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-primary"
                                                                        onClick={() => canDelete && handleDeleteTicket(item)}
                                                                    >
                                                                        <i className="fa-regular fa-trash-can text-danger me-2"></i>
                                                                        Delete
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
                                            <td colSpan="12" className="text-center">
                                                <p>No Data Available</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="mx-3">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                                    recordsPerPage={pageSize} // This MUST match the 'limit' you use in your API call
                                    onPageChange={(page) => fetchTickets(page)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="d-block d-md-none">
                        {dataLoading ? (
                            <div className="container"></div>
                        ) : ticketsData && ticketsData?.length > 0 ? (
                            ticketsData?.map((item, index) => {
                                const canEdit = showEditBtn && permissionsByStatus.edit.includes(item.Status);
                                const canDelete = showDeleteBtn && permissionsByStatus.delete.includes(item.Status);
                                const canApprove = showApproveBtn && permissionsByStatus.approve.includes(item.Status);
                                const canReject = showRejectBtn && permissionsByStatus.reject.includes(item.Status);
                                const canAssignTech = showAssignTechBtn && permissionsByStatus.assignTech.includes(item.Status);
                                const canClose = showCloseBtn && permissionsByStatus.close.includes(item.Status);
                                const canView = showViewBtn;
                                return (
                                    <div key={index} className="card mb-2 shadow-sm rounded">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div className={`badge ${getStatusBadgeClass(item.Status)}`}>
                                                    {item.Status || 'N/A'}
                                                </div>

                                                <div className="d-flex align-items-center gap-2">
                                                    {openPanelId === item.Id && (
                                                        <div className="d-flex align-items-center gap-2 slide-panel">
                                                            <Link to={`/eam/ticket-view/${item.OrgId}/${item.Id}`}>
                                                                <i className="fa-regular fa-eye"
                                                                    style={{
                                                                        cursor: canView ? 'pointer' : 'not-allowed',
                                                                        opacity: canView ? 1 : 0.5,
                                                                        pointerEvents: canView ? 'auto' : 'none',
                                                                        filter: canView ? 'none' : 'blur(1px)',
                                                                    }}
                                                                ></i>
                                                            </Link>
                                                            <i
                                                                className="fa-regular fa-pen-to-square text-info"
                                                                style={{
                                                                    cursor: canEdit ? 'pointer' : 'not-allowed',
                                                                    opacity: canEdit ? 1 : 0.5,
                                                                    pointerEvents: canEdit ? 'auto' : 'none',
                                                                    filter: canEdit ? 'none' : 'blur(1px)',
                                                                }}
                                                                onClick={() => {setIsModalOpen(true); setEditTicketId(item.Id);}}
                                                            ></i>
                                                            <i
                                                                className="fa-solid fa-check"
                                                                style={{
                                                                    cursor: canApprove ? 'pointer' : 'not-allowed',
                                                                    opacity: canApprove ? 1 : 0.5,
                                                                    pointerEvents: canApprove ? 'auto' : 'none',
                                                                }}
                                                                onClick={() => handleApproveClick(item)}
                                                            ></i>
                                                            <i
                                                                className="fa-solid fa-ban text-danger"
                                                                style={{
                                                                    cursor: canReject ? 'pointer' : 'not-allowed',
                                                                    opacity: canReject ? 1 : 0.5,
                                                                    pointerEvents: canReject ? 'auto' : 'none',
                                                                    filter: canReject ? 'none' : 'blur(1px)',
                                                                }}
                                                                onClick={() => canReject && handleReject(item)}
                                                            ></i>
                                                            <i
                                                                className="fa-solid fa-user-nurse text-primary"
                                                                style={{
                                                                    cursor: canAssignTech ? 'pointer' : 'not-allowed',
                                                                    opacity: canAssignTech ? 1 : 0.5,
                                                                    pointerEvents: canAssignTech ? 'auto' : 'none',
                                                                    filter: canAssignTech ? 'none' : 'blur(1px)',
                                                                }}
                                                                data-bs-toggle="offcanvas"
                                                                data-bs-target="#offcanvasRightAssignTech"
                                                                aria-controls="offcanvasRightAssignTech"
                                                                onClick={() => canAssignTech && handleAssignTech(item)}
                                                            ></i>
                                                            <i
                                                                className="fa-solid fa-clipboard-check text-success"
                                                                style={{
                                                                    cursor: canClose ? 'pointer' : 'not-allowed',
                                                                    opacity: canClose ? 1 : 0.5,
                                                                    pointerEvents: canClose ? 'auto' : 'none',
                                                                    filter: canClose ? 'none' : 'blur(1px)',
                                                                }}
                                                                data-bs-toggle="offcanvas"
                                                                data-bs-target="#offcanvasRightCloseTic"
                                                                aria-controls="offcanvasRightCloseTic"
                                                                onClick={() => canClose && handleCloseTicket(item)}
                                                            ></i>
                                                            <i
                                                                className="fa-regular fa-trash-can text-warning"
                                                                style={{
                                                                    cursor: canDelete ? 'pointer' : 'not-allowed',
                                                                    opacity: canDelete ? 1 : 0.5,
                                                                    pointerEvents: canDelete ? 'auto' : 'none',
                                                                    filter: canDelete ? 'none' : 'blur(1px)',
                                                                }}
                                                                onClick={() => canDelete && handleDeleteTicket(item)}
                                                            ></i>
                                                        </div>
                                                    )}

                                                    <span className="arrow-container text-muted" style={{ fontSize: '1.1rem' }}>
                                                        |
                                                        <i
                                                            className={`fa-solid ${openPanelId === item.Id ? 'fa-arrow-right' : 'fa-arrow-left'} ${openPanelId !== item.Id ? 'bounce-left' : ''}`}
                                                            onClick={() => togglePanel(item.Id)}
                                                            style={{ cursor: "pointer", marginLeft: "8px" }}
                                                        ></i>
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="mb-2">
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Ticket code:</span>
                                                    <span className="fw-semibold">{item.TicketCode}</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Machine:</span>
                                                    <span className="fw-semibold">{item.AssetName}</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Created On:</span>
                                                    <span className="fw-semibold">{formatDate(item.CreatedOn) || 'N/A'}</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Technician:</span>
                                                    <span className="fw-semibold">{item.Technician || 'N/A'}</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Priority:</span>
                                                    {item.Priority === 1 && (
                                                        <span className="badge badge-light-danger">High</span>
                                                    )}
                                                    {item.Priority === 2 && (
                                                        <span className="badge badge-light-warning">Medium</span>
                                                    )}
                                                    {item.Priority === 3 && (
                                                        <span className="badge badge-light-primary">Low</span>
                                                    )}
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Last Status:</span>
                                                    <span className="fw-semibold">
                                                        {item.StatusLogs ? (
                                                            <Popover
                                                                content={
                                                                    <div style={{ maxWidth: 250, whiteSpace: "pre-wrap" }}>
                                                                        {item.StatusLogs}
                                                                    </div>
                                                                }
                                                                title="Status Logs"
                                                                trigger="hover"
                                                            >
                                                                <Tooltip >
                                                                    <FileTextOutlined style={{ fontSize: 18, color: "#1890ff", cursor: "pointer" }} />
                                                                </Tooltip>
                                                            </Popover>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Update On:</span>
                                                    <span className="fw-semibold">{formatDate(item.UpdatedOn) || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                            recordsPerPage={pageSize} // This MUST match the 'limit' you use in your API call
                            onPageChange={(page) => fetchTickets(page)}
                        />
                    </div>
                </div>

                <style>
                    {`
                    .table tbody tr:hover {
                        background-color: #f8faff !important;
                        transform: scale(1.01);
                        transition: 0.2s ease-in-out;
                    }

                    .custom-btn {
                    transition: all 0.2s ease-in-out;
                    border-radius: 8px;
                }

                .custom-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
                }
                    .blurred {
                        filter: blur(2px);
                        pointer-events: none;
                        user-select: none;
                        transition: all 0.2s ease-in-out;
                    };
                    .slide-panel {
                        opacity: 0;
                        transform: translateX(20px); /* Start slightly to the right */
                        animation: slideFadeIn 0.3s ease-out forwards;
                    }

                    @keyframes slideFadeIn {
                        from {
                            opacity: 0;
                            transform: translateX(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }

                    @keyframes bounceLeft {
                        0%, 100% {
                            transform: translateX(0);
                        }
                        50% {
                            transform: translateX(-5px);
                        }
                    }

                    .bounce-left {
                        animation: bounceLeft 1s infinite ease-in-out;
                    }
                `}
                </style>
            </div>

            <RegisterTicket
                assetID={targetAsset.id}
                assetName={targetAsset.name}
                deptId={targetAsset.deptId}
            />
            <TechnicianList />
            {isModalOpen && (
                <EditTicket
                    editTicketId={editTicketId}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
            <AssignTechnician ticketObj={ticketData} />
            <CloseTicket ticketObj={closeData} />
        </Base1>
    )
}