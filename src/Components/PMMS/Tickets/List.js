
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


export default function TicketsList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [ticketsData, setTicketsData] = useState([]);
    const [mcnsData, setMCNsData] = useState([]);
    const [ticketsCache, setTicketsCache] = useState({});
    const [dataLoading, setDataLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [closeData, setCloseData] = useState([]);
    const [editData, setEditData] = useState([]);
    const [ticketData, setTicketData] = useState([]);
    const [openPanelId, setOpenPanelId] = useState(null);
    const [selectedMCNId, setSelectedMCNId] = useState(null);
    const [selectedPrioriy, setSelectedPrioriy] = useState("0");
    const [selectedStatus, setSelectedStatus] = useState(["ALL"]);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [departmentsData, setDepartmentsData] = useState([]);

    const [assetTypesData, setAssetTypesData] = useState([]);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const [unitsData, setUnitsData] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState(null);

    const [selectedFromDt, setSelectedFromDt] = useState(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return firstDay.toLocaleDateString('en-CA'); // 'YYYY-MM-DD' in local time
    });

    const [selectedToDt, setSelectedToDt] = useState(() => {
        const now = new Date();
        return now.toISOString().split("T")[0];
    });

    const [approveSubmitLoading, SetApproveSubmitLoading] = useState(null);
    const [usersData, setUsersData] = useState([]);
    const [selectedDueDate, setSelectedDueDate] = useState(null);
    const [selectedItemForApproval, setSelectedItemForApproval] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;

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

    const fetchDDLAssetTypesData = async () => {
        try {

            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&&UserId=${selectedDeptId}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const assetTypesFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "AssetType"
            );

            setAssetTypesData(assetTypesFilteredData || []);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setAssetTypesData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && selectedDeptId) {
            fetchDDLAssetTypesData();
        }
    }, [sessionUserData, selectedDeptId]);

    const fetchTickets = async (page = 1, force = false) => {

        if (!force && ticketsCache[page]) {
            setTicketsData(ticketsCache[page]);
            setCurrentPage(page);
            return;
        }
        setDataLoading(true);

        const payload = {
            ServiceName: "GetTicketsFilter",
            PageNumber: page,
            PageSize: recordsPerPage,
            Params: {
                OrgId: sessionUserData.OrgId,
                MachineId: selectedMCNId || 0,
                UserId: 0,
                Status:
                    selectedStatus.includes("ALL")
                        ? "ALL"
                        : selectedStatus.join(","),
                FromDate: selectedFromDt,
                ToDate: selectedToDt,
                AssetTypeId: 3,
                Priority: selectedPrioriy || 0,
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

                setTicketsCache((prev) => ({ ...prev, [page]: pageData }));
                setTicketsData(pageData);
                setTotalRecords(total);
                setCurrentPage(page);
            } else {
                console.error('Failed to fetch technicians data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching technicians data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    const handleFilterSubmit = () => {
        setTicketsCache({});
        fetchTickets(1, true); // force fresh fetch
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchTickets(1);
            fetchDDLData();
        }
    }, [sessionUserData]);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setDepartmentsData(parsed.depts || []);
                setUnitsData(parsed.units || []);
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

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            const unitsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "UnitLocations"
            );

            setDepartmentsData(departmentsFileredData || []);
            setUnitsData(unitsFilteredData || []);

            sessionStorage.setItem(
                "ddlData",
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
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetchWithAuth(`auth/getUsers?OrgId=${sessionUserData.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                // const filteredUsers = data.ResultData?.filter(user => user.RoleId === 3) || [];
                setUsersData(data.ResultData || []);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchUsers();
        }
    }, [sessionUserData]);

    const handleEdit = (item) => {
        setEditData(item);
    };

    const handleCloseTicket = (item) => {
        setCloseData(item);
    };

    const handleAssignTech = (item) => {
        setTicketData(item);
    };

    const totalPages = Math.ceil(totalRecords / recordsPerPage);

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

    const handleApproveSubmit = async (selectedUser, item) => {
        // e.preventDefault(); // prevent default form submit
        SetApproveSubmitLoading(true);

        if (!selectedUser) {
            Swal.fire("Missing Info", "Please select user", "warning");
            SetApproveSubmitLoading(false);
            return;
        }

        // const item = selectedItemForApproval;
        if (!item) {
            Swal.fire("Error", "No ticket selected for approval", "error");
            SetApproveSubmitLoading(false);
            return;
        }

        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to approve ticket: ${item?.Col2 || item?.TicketCode || item?.Id}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Approve',
            cancelButtonText: 'No',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const formPayload = {
                        OrgId: sessionUserData?.OrgId,
                        Priority: item.Priority,
                        MachineId: item.MachineId,
                        TicketStatus: "APPROVED",
                        TicketId: item?.Id,
                        UserId: sessionUserData?.Id,
                        JsonData: {
                            DueDate: selectedDueDate,
                            MachineId: item.MachineId,
                            TicketCode: item.TicketCode,
                            AssignedEmail: selectedUser.Email,
                            AssignedUser: selectedUser.Name,
                        }
                    };

                    const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formPayload),
                    });

                    const resultData = await response.json();
                    SetApproveSubmitLoading(false);

                    if (resultData.success) {
                        SetApproveSubmitLoading(false);
                        if (resultData.data.result[0].ResponseCode === 2003) {
                            Swal.fire({
                                title: "Success",
                                text: resultData.data.result[0].Logs || "Ticket has been approved successfully.",
                                icon: "success",
                            }).then(() => window.location.reload());
                        }
                    } else {
                        SetApproveSubmitLoading(false);
                        Swal.fire({
                            title: "Error",
                            text: resultData?.ResultData?.ResultMessage || "Approval failed.",
                            icon: "error",
                        });
                    }

                } catch (error) {
                    SetApproveSubmitLoading(false);
                    console.error("Approval error:", error);
                    Swal.fire({
                        title: "Error",
                        text: "Something went wrong while approving the ticket.",
                        icon: "error",
                    });
                }
            }
        });
    };

    const handleApproveClick = (item) => {
        let tempSelectedUser = null; // 🔹 local variable to hold selected user

        Swal.fire({
            title: "Approve Ticket",
            html: `<div id="swal-react-container"></div>`,
            showCancelButton: true,
            confirmButtonText: "Approve",
            cancelButtonText: "Cancel",
            focusConfirm: false,
            didOpen: () => {
                const container = document.getElementById("swal-react-container");
                if (container) {
                    const root = ReactDOM.createRoot(container);
                    root.render(
                        <div style={{ textAlign: "left", width: "100%" }}>
                            <p>
                                <strong>Ticket Code:</strong> {item?.TicketCode || "N/A"}
                            </p>
                            <label style={{ fontWeight: 600 }}>Assign To:</label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Employee"
                                className="w-100 mt-2"
                                dropdownStyle={{ zIndex: 20000 }}
                                getPopupContainer={(triggerNode) => triggerNode.parentNode}
                                onChange={(id) => {
                                    tempSelectedUser = usersData.find((u) => u.Id === id); // 🔹 store locally
                                }}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {usersData.map((user) => (
                                    <Option key={user.Id} value={user.Id}>
                                        {user.Name}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    );
                }
            },
            preConfirm: () => {
                if (!tempSelectedUser) {
                    Swal.showValidationMessage("Please select a user!");
                    return false;
                }
                return tempSelectedUser;
            },
        }).then((result) => {
            if (result.isConfirmed && result.value) {
                // ✅ call your approve service here
                handleApproveSubmit(result.value, item);
            }
        });
    };


    const handleReject = (item) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to reject ticket: ${item?.Col2 || item?.TicketCode || item?.Id}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reject',
            cancelButtonText: 'No',
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

                    if (resultData.success) {
                        if (result.data.result[0].ResponseCode === 2004) {
                            Swal.fire({
                                title: "Success",
                                text: result.data.result[0].Logs || "Ticket has been rejected successfully.",
                                icon: "success",
                            }).then(() => window.location.reload());
                        }
                    } else {
                        Swal.fire({
                            title: "Error",
                            text: resultData?.ResultData?.ResultMessage || "Reject failed.",
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
                return "badge-light-info";
            case "resolved":
                return "badge-light-info";
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
        assignTech: ["APPROVED"],
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
        { value: "MODIFIED", label: "Modified" },
        { value: "APPROVED", label: "Approved" },
        { value: "REJECTED", label: "Rejected" },
        { value: "REQ APPROVAL", label: "REQ-Approval" },
        { value: "REQ APPROVED", label: "REQ-Approved" },
        { value: "RESOLVED", label: "Resolved" },
        { value: "CLOSED", label: "Closed" },
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

                    <div className="d-flex align-items-center gap-2 gap-lg-3 ms-auto">
                        <a
                            className="btn btn-info d-none d-md-block btn-sm"
                            data-bs-toggle="offcanvas"
                            data-bs-target="#offcanvasRightTech"
                            aria-controls="offcanvasRightTech"
                        >
                            Add Tech
                        </a>

                        <a
                            className="btn btn-light-info btn-sm d-block d-md-none"
                            style={{ height: "3rem" }}
                            data-bs-toggle="offcanvas"
                            data-bs-target="#offcanvasRightTech"
                            aria-controls="offcanvasRightTech"
                        >
                            <i className="fa-solid fa-plus fs-2"></i>
                        </a>

                        {showAddBtn && (
                            <>
                                <a
                                    className="btn btn-primary d-none d-md-block btn-sm"
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightAdd"
                                    aria-controls="offcanvasRightAdd"
                                >
                                    Raise Ticket
                                </a>

                                <a
                                    className="btn btn-light-primary btn-sm d-block d-md-none"
                                    style={{ height: "3rem" }}
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightAdd"
                                    aria-controls="offcanvasRightAdd"
                                >
                                    <i className="fa-solid fa-plus fs-2"></i>
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className={`app-content flex-column-fluid pt-2 ${deleteLoading ? 'blurred' : ''}`}>
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card-toolbar mb-2">
                        <div className="row d-flex justify-content-start align-items-end">
                            <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                <label className="form-label">From<span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={selectedFromDt}
                                    onChange={(e) => setSelectedFromDt(e.target.value)}
                                    style={{ height: '3rem' }}
                                />
                            </div>
                            <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                <label className="form-label">To<span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={selectedToDt}
                                    onChange={(e) => setSelectedToDt(e.target.value)}
                                    style={{ height: '3rem' }}
                                />
                            </div>
                            <div className="col-12 col-md-3 mb-2 d-flex flex-column">
                                <label className="form-label">
                                    Unit<span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Select Unit"
                                    className="w-100"
                                    value={selectedUnitId || undefined}
                                    style={{ height: '2.6rem' }}
                                    onChange={(value) => setSelectedUnitId(value)}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {unitsData?.map((unt) => (
                                        <Option key={unt.ItemId} value={unt.ItemId}>
                                            {unt.DisplayValue}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div className="col-12 col-md-3 mb-2 d-flex flex-column">
                                <label className="form-label">
                                    Department<span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Select Department"
                                    className="w-100"
                                    value={selectedDeptId || undefined}
                                    style={{ height: "2.6rem" }}
                                    onChange={(value) => setSelectedDeptId(value)}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {departmentsData?.map((dep) => (
                                        <Option key={dep.ItemId} value={dep.ItemId}>
                                            {dep.DisplayValue}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div className="col-12 col-md-3 mb-2 d-flex flex-column">
                                <label className="form-label">
                                    Asset Type<span className="text-danger">*</span>
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
                                    {assetTypesData?.map((assTyp) => (
                                        <Option key={assTyp.ItemId} value={assTyp.ItemId}>
                                            {assTyp.DisplayValue}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div className="col-12 col-md-3 mb-2 d-flex flex-column">
                                <label className="form-label">
                                    Machine<span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Select Machine"
                                    className="w-100"
                                    value={selectedMCNId}
                                    style={{ height: '3rem' }}
                                    onChange={(value) => setSelectedMCNId(value)}
                                    optionFilterProp="children"
                                    filterOption={(input, option) => {
                                        const text = String(option.children?.[0] || "").toLowerCase();
                                        return text.includes(input.toLowerCase());
                                    }}
                                >
                                    {mcnsData?.map((mcn, indx) => (
                                        <Option key={indx} value={mcn.ItemId}>
                                            {mcn.ItemValue} : <span className="text-primary fw-bold">{mcn.DisplayValue}</span>
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                <label className="form-label">Priority<span className="text-danger">*</span></label>
                                <Select
                                    showSearch
                                    placeholder="Select Priority"
                                    optionFilterProp="label"
                                    value={selectedPrioriy}
                                    onChange={(value) => setSelectedPrioriy(value)}
                                    style={{ width: "100%", height: "3rem" }}
                                    options={[
                                        { value: "0", label: "All" },
                                        { value: "3", label: "Low" },
                                        { value: "2", label: "Medium" },
                                        { value: "1", label: "High" },
                                    ]}
                                />
                            </div>
                            <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                <label className="form-label">Status<span className="text-danger">*</span></label>
                                <Select
                                    mode="multiple"
                                    allowClear
                                    placeholder="Select Status"
                                    style={{ width: "100%", height: "3rem" }}
                                    value={selectedStatus}
                                    onChange={handleStatusChange}
                                    maxTagCount="responsive"
                                    options={statusOptions.map(opt => ({
                                        ...opt,
                                        disabled:
                                            (selectedStatus.includes("ALL") && opt.value !== "ALL") ||
                                            (!selectedStatus.includes("ALL") && opt.value === "ALL")
                                    }))}
                                />
                            </div>
                            <div className="col-12 col-md-1 mb-2 d-flex">
                                <button
                                    className="btn btn-light-primary btn-sm border border-primary w-100 w-md-auto"
                                    type="button"
                                    style={{ height: "3rem", fontSize: "0.9rem" }}
                                    onClick={handleFilterSubmit}
                                    disabled={dataLoading}
                                >
                                    {dataLoading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                        <div className="card d-md-block d-none mt-1">
                            <div className="card-body pt-0">
                                <div className="table-responsive">
                                    <table className="table align-middle table-row-dashed fs-6 gy-5" id="kt_customers_table">
                                        <thead>
                                            <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                                <th className="">S.No</th>
                                                <th className="min-w-125px">Ticket Code</th>
                                                <th className="min-w-125px">MachineName</th>
                                                <th className="min-w-125px">Created On</th>
                                                <th className="min-w-125px">Technician</th>
                                                <th className="min-w-100px">Priority</th>
                                                <th className="min-w-100px">Status</th>
                                                <th className="min-w-100px">Updated On</th>
                                                <th className="min-w-100px">Aging</th>
                                                <th className="min-w-100px text-center">Last Log</th>
                                                <th className="">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fw-semibold text-gray-600">
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
                                                    const canAssignTech = showAssignTechBtn && permissionsByStatus.assignTech.includes(item.Status);
                                                    const canClose = showCloseBtn && permissionsByStatus.close.includes(item.Status);
                                                    const canView = showViewBtn;
                                                    return (
                                                        <tr>
                                                            <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                            <td>
                                                                <a href="#" className="text-gray-600 text-hover-primary mb-1">{item.TicketCode}</a>
                                                            </td>
                                                            <td>
                                                                <a className="text-gray-800 text-hover-primary mb-1" title={item?.MachineName}>{item?.MachineName.length > 15 ? item?.MachineName.slice(0, 15) + '...' : item.MachineName}</a>
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
                                                            <td>
                                                                {formatDate(item.UpdatedOn)}
                                                            </td>
                                                            <td className="text-info">
                                                                {getAgingStatus(item.DueDate, item.Status, item.UpdatedOn)}
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
                                                            <td className="">
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
                                                                                <Link to={`/pmms/ticket-view/${item.OrgId}/${item.Id}`}>
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
                                                                                data-bs-toggle="offcanvas"
                                                                                data-bs-target="#offcanvasRightEdit"
                                                                                aria-controls="offcanvasRightEdit"
                                                                                onClick={() => canEdit && handleEdit(item)}
                                                                            >
                                                                                <i className="fa-regular fa-pen-to-square me-2 text-info"></i>
                                                                                Edit
                                                                            </p>
                                                                            <p
                                                                                style={{
                                                                                    cursor: canApprove ? 'pointer' : 'not-allowed',
                                                                                    opacity: canApprove ? 1 : 0.5,
                                                                                    pointerEvents: canApprove ? 'auto' : 'none',
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
                                                                                    cursor: canAssignTech ? 'pointer' : 'not-allowed',
                                                                                    opacity: canAssignTech ? 1 : 0.5,
                                                                                    pointerEvents: canAssignTech ? 'auto' : 'none',
                                                                                    filter: canAssignTech ? 'none' : 'blur(1px)',
                                                                                }}
                                                                                className="text-hover-primary"
                                                                                data-bs-toggle="offcanvas"
                                                                                data-bs-target="#offcanvasRightAssignTech"
                                                                                aria-controls="offcanvasRightAssignTech"
                                                                                onClick={() => canAssignTech && handleAssignTech(item)}
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
                                                    <td colSpan="8" className="text-center">
                                                        <p>No Data Available</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={(page) => fetchTickets(page)}
                                    />
                                </div>
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
                                                            <Link to={`/pmms/ticket-view/${item.OrgId}/${item.Id}`}>
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
                                                                data-bs-toggle="offcanvas"
                                                                data-bs-target="#offcanvasRightEdit"
                                                                aria-controls="offcanvasRightEdit"
                                                                onClick={() => canEdit && handleEdit(item)}
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
                                                    <span className="fw-semibold">{item.MachineName}</span>
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
                            onPageChange={(page) => fetchTickets(page)}
                        />
                    </div>
                </div>


                {/* Ticket Approve */}
                <style>
                    {`
                        @media (min-width: 768px) { /* Medium devices and up (md) */
                            #offcanvasRightApprove {
                                width: 50% !important;
                            }
                        }
                    `}
                </style>
                {/* <div
                    className="offcanvas offcanvas-end"
                    tabIndex="-1"
                    id="offcanvasRightApprove"
                    aria-labelledby="offcanvasRightLabel"
                    style={{ width: "90%" }}
                >
                    <form autoComplete="off" onSubmit={handleApproveSubmit}>
                        <div className="offcanvas-header d-flex justify-content-between align-items-center">
                            <h5 id="offcanvasRightLabel" className="mb-0">Approve (Assign Ticket to User)</h5>
                            <div className="d-flex align-items-center">
                                <button className="btn btn-primary btn-sm me-2" type="submit" disabled={approveSubmitLoading}>
                                    {approveSubmitLoading ? "Submitting..." : "Submit"}
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
                            <div className="row">
                                {selectedItemForApproval && (
                                    <div className="mb-3">
                                        <strong>Ticket:</strong> <span className="fs-4 text-primary">{selectedItemForApproval?.TicketCode || selectedItemForApproval?.Col2}</span>
                                    </div>
                                )}
                                <div className="col-12 col-md-6 mb-2">
                                    <label className="form-label">
                                        Operational By <span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select Employee"
                                        className="w-100"
                                        value={selectedUser ? selectedUser?.Id : undefined}
                                        style={{ height: '2.8rem' }}
                                        onChange={(id) => {
                                            const user = usersData.find((u) => u.Id === id);
                                            setSelectedUser(user);
                                        }}
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                    >
                                        {usersData?.map((user) => (
                                            <Option key={user.Id} value={user.Id}>
                                                {user.Name}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-6 mb-2">
                                    <label className="form-label">
                                        Due Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        className="form-control"
                                        type="date"
                                        value={selectedDueDate}
                                        style={{ height: '2.8rem' }}
                                        min={new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setSelectedDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div> */}

                <style>
                    {`
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

            <RegisterTicket />
            <TechnicianList />
            <EditTicket editObj={editData} />
            <AssignTechnician ticketObj={ticketData} />
            <CloseTicket ticketObj={closeData} />
        </Base1>
    )
}