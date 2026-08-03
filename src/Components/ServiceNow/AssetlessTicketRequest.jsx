
import React, { useState, useEffect } from "react";
import Base1 from "../Config/Base1";
import { Popover, Tooltip, Select, Modal, Mentions, message } from 'antd';
import '../Config/Pagination.css';
import '../Config/Loader.css';
import { Link, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../utils/api";
import Pagination from "../Pagination/Pagination";
import RegisterTicket from "./RaiseTicket";
import CloseTicket from "./CloseTicket";
import { BASE_IMAGE_API_GET } from "../Config/Config";


export default function AssetlessTicketRequest() {

    const navigate = useNavigate();

    const [sessionUserData, setSessionUserData] = useState([]);
    const [ticketsData, setTicketsData] = useState([]);
    const [ticketsCache, setTicketsCache] = useState({});
    const [dataLoading, setDataLoading] = useState(false);
    const [selectedPrioriy, setSelectedPrioriy] = useState("0");
    const [selectedStatus, setSelectedStatus] = useState(["ALL"]);
    // const [targetAsset, setTargetAsset] = useState({ id: 0, name: "", deptId: 0 });
    const [selectedTicketCode, setSelectedTicketCode] = useState("");
    const [serviceTypesData, setServiceTypesData] = useState([]);
    const [ticTypesData, setTicTypesData] = useState([]);
    const [selectedTicTypeId, setSelectedTicTypeId] = useState(null);
    const [selectedServiceTypeId, setSelectedServiceTypeId] = useState(null);
    const [usersData, setUsersData] = useState([]);
    const [deptsData, setDeptsData] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('0');
    const [selectedDeptId, setSelectedDeptId] = useState('0');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [closeData, setCloseData] = useState([]);

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

    const [selectedFromDt, setSelectedFromDt] = useState(
        savedTicketFilters?.fromDate || "2025-10-01"
    );

    const [selectedToDt, setSelectedToDt] = useState(
        savedTicketFilters?.toDate ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
    );

    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);

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
                (item) => item.MenuName === "ServiceNow"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlTicketsServiceNowData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setUsersData(parsed.users || []);
                setDeptsData(parsed.depts || []);
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

            const usersFileredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            const deptsFileredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            setUsersData(usersFileredData || []);
            setDeptsData(deptsFileredData || []);

            sessionStorage.setItem(
                "ddlTicketsServiceNowData",
                JSON.stringify({
                    users: usersFileredData,
                    depts: deptsFileredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUsersData([]);
        }
    };

    const fetchServiceTypes = async () => {
        const storageKey = `ticketTypes_${sessionUserData?.OrgId}`;

        // Check sessionStorage first
        const cachedData = sessionStorage.getItem(storageKey);

        if (cachedData) {
            setServiceTypesData(JSON.parse(cachedData));
            return;
        }

        try {
            const response = await fetchWithAuth(
                `ServiceNow/GetticketTypes?OrgId=${sessionUserData?.OrgId}&ParentId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            const result = data.ResultData || [];

            // Save to sessionStorage
            sessionStorage.setItem(storageKey, JSON.stringify(result));

            setServiceTypesData(result);
        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setServiceTypesData([]);
        }
    };

    const fetchTicketTypes = async () => {

        try {
            const response = await fetchWithAuth(
                `ServiceNow/GetticketTypes?OrgId=${sessionUserData?.OrgId}&ParentId=${selectedServiceTypeId}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            const result = data.ResultData || [];

            setTicTypesData(result);
        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setTicTypesData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchServiceTypes();
            fetchDDLData();
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (sessionUserData.OrgId && selectedServiceTypeId) {
            fetchTicketTypes();
        }
    }, [sessionUserData, selectedServiceTypeId]);

    const fetchTickets = async (
        page = 1,
        force = false,
        overridePageSize = null
    ) => {

        if (!sessionUserData?.OrgId) return;

        if (!selectedServiceTypeId) {
            message.warning("Please select Service Type.");
            return;
        }

        const finalPageSize = overridePageSize ?? pageSize;

        const cacheKey = `${page}-${finalPageSize}`;

        if (!force && ticketsCache[cacheKey]) {
            setTicketsData(ticketsCache[cacheKey]);
            setCurrentPage(page);
            return;
        }

        setDataLoading(true);

        const payload = {
            ServiceName: "GeneralTickets",
            PageNumber: page,
            PageSize: finalPageSize,
            Params: {
                OrgId: sessionUserData.OrgId,
                DeptId: 0,
                UserId: sessionUserData?.RoleId !== 3 ? selectedUserId : sessionUserData?.Id,
                Status: selectedStatus.includes("ALL")
                    ? "ALL"
                    : selectedStatus.join(","),
                FromDate: selectedFromDt,
                ToDate: selectedToDt,
                ParentId: selectedServiceTypeId || 0,
                TicketTypeId: selectedTicTypeId || 0,
                Priority: selectedPrioriy || 0,
                TicketCode: selectedTicketCode || "ALL",
            },
        };

        try {
            const response = await fetchWithAuth(`ServiceNow/GeneralTicketsFilter`, {
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
            setSelectedFromDt(saved.fromDate);
            setSelectedToDt(saved.toDate);
            setPageSize(saved.pageSize || 10);

            const restoredPage = saved.page || 1;
            setCurrentPage(restoredPage);

            // 🔥 Important: Pass EVERYTHING explicitly
            fetchTickets(
                restoredPage,
                true,
                saved.pageSize
            );
        }

    }, [sessionUserData?.OrgId]);

    const handleFilterSubmit = () => {

        const ticketFilters = {
            fromDate: selectedFromDt,
            toDate: selectedToDt,
            // assetTypeId: selectedTicTypeId,
            priority: selectedPrioriy,
            status: selectedStatus,
            page: 1 // ⭐ Reset page when new submit
        };

        sessionStorage.setItem("ticketFilters", JSON.stringify(ticketFilters));

        setTicketsCache({});
        fetchTickets(1, true);
    };

    const totalPages = Math.ceil(totalRecords / pageSize);

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

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";

        return new Intl.DateTimeFormat("en-GB", {
            timeZone: "UTC",
        }).format(new Date(dateString)).replace(/\//g, "-");
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

    const fetchComments = async (ticketId) => {
        try {
            setCommentsLoading(true);

            const response = await fetchWithAuth(
                `ServiceNow/GetTicketComments?OrgId=${sessionUserData.OrgId}&TicketId=${ticketId}`,
                {
                    method: "GET",
                }
            );

            if (!response.ok) throw new Error();

            const data = await response.json();

            setComments(data.ResultData || []);
        } catch (e) {
            setComments([]);
        } finally {
            setCommentsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedTicket?.Id) {
            fetchComments(selectedTicket.Id);
        };
    }, [selectedTicket]);


    const mentionedEmails = [];

    usersData.forEach((user) => {
        const mention = `@${user.ItemValue}`;

        if (commentText.includes(mention)) {
            mentionedEmails.push(user.DisplayValue);
        }
    });

    const handleAddComment = async () => {

        if (!commentText.trim()) {
            message.warning("Please enter comment.");
            return;
        }

        const payload = {
            OrgId: sessionUserData.OrgId,
            Priority: selectedTicket.Priority,
            UserId: sessionUserData.Id,
            CommentType: "ServiceNow",
            JsonData: {
                CommentText: commentText,
                TablePrimaryId: selectedTicket.Id,
                ToEmails: [...new Set(mentionedEmails)].join(","),
                CommentId: editingComment ? editingComment.Id : 0,
                CreatedFrom: 1
            }
        };

        const response = await fetchWithAuth(
            "Portal/AddNewComments",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        const data = await response.json();

        const result = data?.data?.result?.[0];

        if (result.ResponseCode === 2001) {

            message.success(result.ResponseMessage);

            setCommentText("");

            setEditingComment(null);

            fetchComments(selectedTicket.Id);
        }
    };

    const handleCloseTicket = (item) => {
        setCloseData(item);
    };

    const filteredUsers = selectedDeptId && selectedDeptId !== "0"
        ? usersData.filter(
            (user) => Number(user.ConditionalId1) === Number(selectedDeptId)
        )
        : usersData;

    useEffect(() => {
        setSelectedUserId("0"); // or undefined
    }, [selectedDeptId]);

    const handleDownload = async (imageUrl, fileName) => {
        if (!imageUrl) return;
        try {
            const res = await fetch(`${BASE_IMAGE_API_GET}${imageUrl}`);
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName || imageUrl.split("/").pop();
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Download failed:", err);
        }
    };

    const priorityLabel = (p) => (p === 1 ? "High" : p === 2 ? "Medium" : "Low");
    const priorityColor = (p) => (p === 1 ? "danger" : p === 2 ? "warning" : "secondary");

    const showAddBtn = sessionActionIds?.includes(1);
    const showViewBtn = sessionActionIds?.includes(2);
    const showCloseBtn = true;


    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column">
                        <Link
                            to="/user-modules"
                            className="text-muted text-hover-primary fs-7 fw-semibold mb-2"
                        >
                            <i className="fa-solid fa-arrow-left me-2"></i>
                            Back to Modules
                        </Link>

                        <div className="d-flex align-items-center">
                            <div
                                className="rounded-3 bg-primary bg-opacity-10 d-flex align-items-center justify-content-center me-3"
                                style={{ width: 42, height: 42 }}
                            >
                                <i className="fa-solid fa-ticket text-primary"></i>
                            </div>
                            <div>
                                <h1 className="fw-bold fs-3 mb-0">
                                    Service Requests
                                </h1>
                                <div className="text-muted fs-7">
                                    Create, manage, and monitor service requests across your organization.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <Link
                            to="/service-requests/my-tickets"
                            className="btn btn-light-primary btn-sm"
                        >
                            <i className="fa-solid fa-list-check me-2"></i>
                            My Tickets
                        </Link>

                        {showAddBtn && (
                            <button
                                className="btn btn-primary btn-sm"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAdd"
                            // onClick={() => setTargetAsset({ id: 0, name: "", deptId: 0 })}
                            >
                                <i className="fa-solid fa-plus me-2"></i>
                                Raise Ticket
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className={`app-content flex-column-fluid pt-2`}>
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
                                    <label className="form-label fw-bold fs-8 text-gray-700">From<span className="text-danger">*</span></label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={selectedFromDt}
                                        onChange={(e) => setSelectedFromDt(e.target.value)}
                                        style={{ height: '2.6rem' }}
                                    />
                                </div>
                                <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label fw-bold fs-8 text-gray-700">To<span className="text-danger">*</span></label>
                                    <input
                                        type="date"
                                        className="form-control form-control-sm"
                                        value={selectedToDt}
                                        onChange={(e) => setSelectedToDt(e.target.value)}
                                        style={{ height: '2.6rem' }}
                                    />
                                </div>

                                <div className="col-12 col-md-3 mb-2 d-flex flex-column">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Service Type
                                    </label>
                                    <Select
                                        showSearch
                                        placeholder="Select Service Type"
                                        className="w-100"
                                        value={selectedServiceTypeId || undefined}
                                        style={{ height: "2.6rem" }}
                                        onChange={(value) => setSelectedServiceTypeId(value)}
                                        filterOption={(input, option) => {
                                            const text = `${option?.children}`.toLowerCase();
                                            return text.includes(input.toLowerCase());
                                        }}
                                    >
                                        {Array.isArray(serviceTypesData) && serviceTypesData.map((ticTyp) => (
                                            <Option key={ticTyp.Id} value={ticTyp.Id}>
                                                {ticTyp.TicketType}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-3 mb-2 d-flex flex-column">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Ticket Type
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select Ticket Type"
                                        className="w-100"
                                        value={selectedTicTypeId || undefined}
                                        style={{ height: "2.6rem" }}
                                        onChange={(value) => setSelectedTicTypeId(value)}
                                        filterOption={(input, option) => {
                                            const text = `${option?.children}`.toLowerCase();
                                            return text.includes(input.toLowerCase());
                                        }}
                                    >
                                        {Array.isArray(ticTypesData) && ticTypesData.map((ticTyp) => (
                                            <Option key={ticTyp.Id} value={ticTyp.Id}>
                                                {ticTyp.TicketType}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Department
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select Department"
                                        className="w-100"
                                        value={selectedDeptId || undefined}
                                        style={{ height: "2.6rem" }}
                                        onChange={(value) => setSelectedDeptId(value)}
                                        filterOption={(input, option) => {
                                            const text = `${option?.children}`.toLowerCase();
                                            return text.includes(input.toLowerCase());
                                        }}
                                    >
                                        <Option value="0">ALL</Option>
                                        {Array.isArray(deptsData) && deptsData.map((ticTyp) => (
                                            <Option key={ticTyp.ItemId} value={ticTyp.ItemId}>
                                                {ticTyp.ItemValue}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                {sessionUserData?.RoleId != 3 && (
                                    <div className="col-12 col-md-2 mb-2 d-flex flex-column">
                                        <label className="form-label fw-bold fs-8 text-gray-700">
                                            Raised User
                                        </label>

                                        <Select
                                            showSearch
                                            allowClear
                                            placeholder="Select User"
                                            className="w-100"
                                            value={selectedUserId || undefined}
                                            style={{ height: "2.6rem" }}
                                            onChange={(value) => setSelectedUserId(value)}
                                            filterOption={(input, option) =>
                                                option?.label
                                                    ?.toLowerCase()
                                                    ?.includes(input.toLowerCase())
                                            }
                                            options={[
                                                { value: "0", label: "ALL" },
                                                ...filteredUsers.map((user) => ({
                                                    value: user.ItemId,
                                                    label: user.ItemValue,
                                                })),
                                            ]}
                                        />
                                    </div>
                                )}

                                <div className="col-6 col-md-2 mb-2 d-flex flex-column">
                                    <label className="form-label fw-bold fs-8 text-gray-700">Priority</label>
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
                                    <label className="form-label fw-bold fs-8 text-gray-700">Status</label>
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
                                <div className="col-6 col-md-2 mb-2">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Ticket Code
                                    </label>
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm pe-10"
                                            placeholder="Enter ticket code"
                                            value={selectedTicketCode}
                                            onChange={(e) => setSelectedTicketCode(e.target.value)}
                                        />

                                        {selectedTicketCode && (
                                            <span
                                                className="position-absolute top-50 end-0 translate-middle-y me-3 cursor-pointer text-gray-400 text-hover-primary"
                                                onClick={() => setSelectedTicketCode("")}
                                                style={{ transition: "color 0.2s" }}
                                            >
                                                <i className="fa-solid fa-circle-xmark fs-7"></i>
                                            </span>
                                        )}
                                    </div>
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
                                        <th className="min-w-125px">Created On</th>
                                        <th className="min-w-205px">Ticket Type</th>
                                        <th className="min-w-100px text-center">Priority</th>
                                        <th className="min-w-100px text-center">Status</th>
                                        <th className="min-w-100px">Aging</th>
                                        <th className="min-w-80px">Action Req. By</th>
                                        <th className="min-w-40px">Actions</th>
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
                                            const showApproveBtn =
                                                sessionUserData?.RoleId === 5 &&
                                                item.Status?.toUpperCase() === "NEW";

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
                                                        {item.TicketCode}
                                                    </td>
                                                    <td>{formatDate(item.CreatedOn) || 'N/A'}</td>
                                                    <td>{item.TicketType || 'N/A'}</td>
                                                    <td className="text-center">
                                                        {item.Priority === 1 && (
                                                            <span
                                                                className="badge badge-light-danger d-inline-flex align-items-center justify-content-center"
                                                                style={{ width: "80px" }}
                                                            >
                                                                High
                                                            </span>
                                                        )}
                                                        {item.Priority === 2 && (
                                                            <span
                                                                className="badge badge-light-warning d-inline-flex align-items-center justify-content-center"
                                                                style={{ width: "80px" }}
                                                            >
                                                                Medium
                                                            </span>
                                                        )}
                                                        {item.Priority === 3 && (
                                                            <span
                                                                className="badge badge-light-primary d-inline-flex align-items-center justify-content-center"
                                                                style={{ width: "80px" }}
                                                            >
                                                                Low
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="text-center">
                                                        <span
                                                            className={`badge ${getStatusBadgeClass(item.Status)} d-inline-flex align-items-center justify-content-center`}
                                                            style={{ width: "80px" }}
                                                        >
                                                            {item.Status}
                                                        </span>
                                                    </td>
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
                                                    <td>
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light-primary text-primary"
                                                                style={{ width: "28px", height: "28px", flexShrink: 0 }}
                                                            >
                                                                <i className="fa-solid fa-user"></i>
                                                            </span>

                                                            <span>{item.ActionRequiredFrom || '---'}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Popover
                                                            placement="bottom"
                                                            content={
                                                                <div style={{ width: '8rem' }}>
                                                                    <p
                                                                        onClick={() => {
                                                                            if (!showViewBtn) return;

                                                                            setSelectedTicket(item);
                                                                            setCommentsOpen(true);
                                                                        }}
                                                                        style={{
                                                                            cursor: showViewBtn ? "pointer" : "not-allowed",
                                                                            opacity: showViewBtn ? 1 : 0.5,
                                                                            pointerEvents: showViewBtn ? "auto" : "none",
                                                                            filter: showViewBtn ? "none" : "blur(1px)",
                                                                        }}
                                                                        className="text-hover-primary"
                                                                    >
                                                                        <i className="fa-solid fa-clipboard-check text-primary me-2"></i>
                                                                        View
                                                                    </p>
                                                                    {item.CreatedBy === sessionUserData?.Id &&
                                                                        item.Status === "APPROVED" && (
                                                                            <p
                                                                                style={{
                                                                                    cursor: showCloseBtn ? "pointer" : "not-allowed",
                                                                                    opacity: showCloseBtn ? 1 : 0.5,
                                                                                    pointerEvents: showCloseBtn ? "auto" : "none",
                                                                                }}
                                                                                className="text-hover-danger"
                                                                                data-bs-toggle="offcanvas"
                                                                                data-bs-target="#offcanvasRightCloseTic"
                                                                                onClick={() => handleCloseTicket(item)}
                                                                            >
                                                                                <i className="fa-solid fa-circle-check text-danger me-2"></i>
                                                                                Close
                                                                            </p>
                                                                        )}
                                                                    {/* <p
                                                                        onClick={() => showApproveBtn && handleApproveTicket(item)}
                                                                        style={{
                                                                            cursor: showApproveBtn ? "pointer" : "not-allowed",
                                                                            opacity: showApproveBtn ? 1 : 0.5,
                                                                            pointerEvents: showApproveBtn ? "auto" : "none",
                                                                        }}
                                                                        className="text-hover-success"
                                                                    >
                                                                        <i className="fa-solid fa-circle-check text-success me-2"></i>
                                                                        Approve
                                                                    </p> */}
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
                </div>



                {/* Commnets Modal */}
                <Modal
                    open={commentsOpen}
                    title={
                        <div className="d-flex justify-content-between align-items-center w-100 pe-4">
                            <div className="d-flex align-items-center">
                                <i className="fa-solid fa-comments text-primary me-2"></i>
                                <span>Ticket Comments</span>
                            </div>
                    
                            {selectedTicket?.ImageUrl && (
                                <button
                                    type="button"
                                    className="btn btn-icon btn-sm btn-light-primary"
                                    title="Download Attachment"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownload(selectedTicket.ImageUrl);
                                    }}
                                >
                                    <i className="bi bi-download"></i>
                                </button>
                            )}
                        </div>
                    }
                    onCancel={() => setCommentsOpen(false)}
                    footer={null}
                    width={700}
                    centered
                >
                    <div className="card border-0 bg-light-primary mb-2">
                        <div className="card-body py-2 px-3" style={{ fontSize: "0.8rem" }}>
                            {/* Header row */}
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <div className="d-flex align-items-center gap-1 flex-wrap">
                                    <span className="fw-bold text-primary" style={{ fontSize: "0.85rem" }}>
                                        {selectedTicket?.TicketCode}
                                    </span>
                                    <span className="badge badge-light-success py-1 px-2" style={{ fontSize: "0.65rem" }}>
                                        {selectedTicket?.Status}
                                    </span>
                                    <span className={`badge badge-light-${priorityColor(selectedTicket?.Priority)} py-1 px-2`} style={{ fontSize: "0.65rem" }}>
                                        {priorityLabel(selectedTicket?.Priority)}
                                    </span>
                                </div>
                                <small className="text-muted" style={{ fontSize: "0.7rem" }}>
                                    Due: {formatDate(selectedTicket?.DueDate)}
                                </small>
                            </div>

                            {/* Compact field grid */}
                            <div className="row g-2 mb-1">
                                <div className="col-4">
                                    <div className="text-muted" style={{ fontSize: "0.65rem" }}>Service Type</div>
                                    <div className="fw-semibold" style={{ fontSize: "0.78rem" }}>{selectedTicket?.ServiceType || "-"}</div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted" style={{ fontSize: "0.65rem" }}>Ticket Type</div>
                                    <div className="fw-semibold" style={{ fontSize: "0.78rem" }}>{selectedTicket?.TicketType || "-"}</div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted" style={{ fontSize: "0.65rem" }}>Issue Type</div>
                                    <div className="fw-semibold" style={{ fontSize: "0.78rem" }}>{selectedTicket?.IssueType || "-"}</div>
                                </div>
                            </div>

                            <div className="mb-1">
                                <div className="text-muted" style={{ fontSize: "0.65rem" }}>Description</div>
                                <div className="text-gray-700" style={{ fontSize: "0.78rem" }}>{selectedTicket?.Description || "-"}</div>
                            </div>

                            {(selectedTicket?.ResolutionSummary || selectedTicket?.ResolvedDate) && (
                                <div className="row g-2">
                                    <div className="col-4">
                                        <div className="text-muted" style={{ fontSize: "0.65rem" }}>Resolved Date</div>
                                        <div className="fw-semibold text-success" style={{ fontSize: "0.78rem" }}>
                                            {selectedTicket?.ResolvedDate ? formatDate(selectedTicket.ResolvedDate) : "-"}
                                        </div>
                                    </div>
                                    <div className="col-8">
                                        <div className="text-muted" style={{ fontSize: "0.65rem" }}>Resolution Summary</div>
                                        <div className="text-gray-700" style={{ fontSize: "0.78rem" }}>{selectedTicket?.ResolutionSummary}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Existing Comments */}
                    <div className="mb-4" style={{
                        maxHeight: "250px",
                        overflowY: "auto",
                        paddingRight: "6px",
                    }}>
                        {commentsLoading ? (
                            <div className="text-center py-5">
                                Loading...
                            </div>
                        ) : comments.length > 0 ? (
                            comments.map((item) => (
                                <div
                                    key={item.CommentId}
                                    className="border rounded p-3 mb-3"
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-1">

                                        <div className="d-flex align-items-center gap-2">
                                            <strong>{item.CommentedUser}</strong>

                                            <span
                                                className={`badge ${item.CreatedFrom === 1
                                                    ? "badge-light-primary"
                                                    : "badge-light-success"
                                                    }`}
                                            >
                                                {item.CreatedFrom === 1 ? "Internal User" : "External User"}
                                            </span>
                                        </div>

                                        <div className="d-flex align-items-center gap-2">

                                            <small className="text-muted">
                                                {formatDate(item.CommentedOn)}
                                            </small>

                                            {item.CommentedBy === sessionUserData.Id && (
                                                <button
                                                    className="btn btn-icon btn-sm btn-light-primary"
                                                    onClick={() => {
                                                        setEditingComment(item);
                                                        setCommentText(item.CommentText);
                                                    }}
                                                >
                                                    <i className="fa-solid fa-pen"></i>
                                                </button>
                                            )}
                                        </div>

                                    </div>
                                    <div className="d-flex justify-content-between">
                                        <strong>{item.UserName}</strong>
                                    </div>

                                    <p className="mt-2 mb-0">
                                        {item.CommentText.split(/(@\w+)/g).map((part, i) =>
                                            part.startsWith("@") ? (
                                                <span
                                                    key={i}
                                                    className="fw-bold text-primary"
                                                >
                                                    {part}
                                                </span>
                                            ) : (
                                                part
                                            )
                                        )}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted py-3">
                                No comments available.
                            </div>
                        )}
                    </div>

                    {/* Add Comment */}
                    <div className="mb-3">
                        <label className="form-label fw-semibold">
                            {editingComment ? "Edit Comment" : "Add Comment"}
                        </label>
                        <Mentions
                            rows={5}
                            style={{
                                minHeight: 60,
                            }}
                            optionStyle={{
                                padding: "10px 14px"
                            }}
                            value={commentText}
                            onChange={setCommentText}
                            placeholder="Type your comment... Use @ to mention users."
                            options={usersData.map(user => ({
                                value: user.ItemValue,
                                label: (
                                    <div>
                                        <div className="fw-bold">{user.ItemValue}</div>
                                        <small className="text-muted">
                                            {user.DisplayValue2}
                                        </small>
                                    </div>
                                )
                            }))}
                        />
                    </div>

                    <div className="text-end">
                        <button
                            className="btn btn-light btn-sm me-2"
                            onClick={() => setCommentsOpen(false)}
                        >
                            <i className="fa-solid fa-xmark me-2"></i>
                            Cancel
                        </button>

                        {editingComment && (
                            <button
                                className="btn btn-light-danger btn-sm me-2"
                                onClick={() => {
                                    setEditingComment(null);
                                    setCommentText("");
                                }}
                            >
                                <i className="fa-solid fa-rotate-left me-2"></i>
                                Cancel Edit
                            </button>
                        )}

                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleAddComment}
                        >
                            <i
                                className={`fa-solid ${editingComment ? "fa-pen-to-square" : "fa-paper-plane"
                                    } me-2`}
                            ></i>

                            {editingComment ? "Update Comment" : "Submit Comment"}
                        </button>
                    </div>
                </Modal>

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
                `}
                </style>
            </div>

            <CloseTicket ticObj={closeData} />
            <RegisterTicket serviceTypesData={serviceTypesData} />
        </Base1>
    )
}