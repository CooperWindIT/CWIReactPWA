
import React, { useState, useEffect } from "react";
import Base1 from "../Config/Base1";
import { Popover, Tooltip, Modal, message, Mentions } from 'antd';
import '../Config/Pagination.css';
import '../Config/Loader.css';
import { Link, useNavigate, useLocation } from "react-router-dom";
import { fetchWithAuth } from "../../utils/api";


export default function AssetlessTechMyTickets() {

    const navigate = useNavigate();
    const location = useLocation();

    const [sessionUserData, setSessionUserData] = useState([]);
    const [ticketsData, setTicketsData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [usersData, setUsersData] = useState([]);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [cmtSubmitLoading, setCmtSubmitLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    const fetchDDLData = async () => {
            try {
                const sessionDDL = sessionStorage.getItem("ddlTicketsServiceNowData");
    
                if (sessionDDL) {
                    const parsed = JSON.parse(sessionDDL);
    
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
    
                const usersFileredData = data.ResultData.filter(
                    (item) => item.DDLName === "Users"
                );
    
                setUsersData(usersFileredData || []);
    
                sessionStorage.setItem(
                    "ddlTicketsServiceNowData",
                    JSON.stringify({
                        users: usersFileredData,
                    })
                );
    
            } catch (error) {
                console.error("Failed to fetch DDL data:", error);
                setUsersData([]);
            }
        };

    const fetchTicketsData = async () => {
        try {
            setDataLoading(true);

            const response = await fetchWithAuth(
                `ServiceNow/TechinicanGeneralTickets?OrgId=${sessionUserData?.OrgId}&UserId=${sessionUserData?.Id}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch dashboard data.");
            }

            const data = await response.json();

            setTicketsData(data?.ResultData || []);
        } catch (error) {
            console.error("Dashboard fetch failed:", error);
            setTicketsData([]);
        } finally {
            setDataLoading(false);
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

        setCmtSubmitLoading(true);

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
                CreatedFrom: 2
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
            setCmtSubmitLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && sessionUserData?.Id) {
            fetchTicketsData();
            fetchDDLData();
        }
    }, [sessionUserData]);

    const filteredTickets = Array.isArray(ticketsData)
    ? ticketsData.filter((item) => {
          const priorityLabel =
              item.Priority === 1
                  ? "high"
                  : item.Priority === 2
                  ? "medium"
                  : item.Priority === 3
                  ? "low"
                  : "";

          const search = searchText.toLowerCase();

          return (
              item.TicketCode?.toLowerCase().includes(search) ||
              item.TicketType?.toLowerCase().includes(search) ||
              item.Status?.toLowerCase().includes(search) ||
              priorityLabel.includes(search)
          );
      })
    : [];

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

    const showViewBtn = true;

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column">
                        <div className="d-flex align-items-center">
                            <div
                                className="rounded-3 bg-primary bg-opacity-10 d-flex align-items-center justify-content-center me-3"
                                style={{ width: 42, height: 42 }}
                            >
                                <i className="fa-solid fa-ticket text-primary"></i>
                            </div>
                            <div>
                                <h1 className="fw-bold fs-3 mb-0">
                                    My Ticket Requests
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <Link
                            to="/tech-tickets"
                            className="btn btn-light-primary btn-sm"
                        >
                            <i className="fa-solid fa-list-check me-2"></i>
                            Tickets List
                        </Link>
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className={`app-content flex-column-fluid pt-2`}>
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card d-md-block d-none mt-1 mb-10 shadow-sm">
                        <div className="table-responsive">
                        <div className="card mb-3 shadow-sm">
    <div className="card-body py-3">
        <div className="row align-items-center">

            <div className="col-md-4">
                <div className="position-relative">

                    <i
                        className="fa-solid fa-magnifying-glass position-absolute text-muted"
                        style={{
                            left: "14px",
                            top: "50%",
                            transform: "translateY(-50%)"
                        }}
                    ></i>

                    <input
                        type="text"
                        className="form-control ps-10"
                        placeholder="Search Ticket Code, Type, Priority or Status..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />

                </div>
            </div>

            <div className="col-md-8 text-end">
                <span className="badge badge-light-primary fs-7">
                    Total : {filteredTickets.length}
                </span>
            </div>

        </div>
    </div>
</div>
                            <table className="table align-middle table-hover gs-7 gy-5 mb-0 fs-6">
                                <thead className="bg-light-primary">
                                    <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom-2 border-primary">
                                        <th className="">S.No</th>
                                        <th className="min-w-125px">Ticket Code</th>
                                        <th className="min-w-125px">Created On</th>
                                        <th className="min-w-205px">Sub-category</th>
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
                                    ) : filteredTickets && filteredTickets?.length > 0 ? (
                                        filteredTickets?.map((item, index) => {

                                            return (
                                                <tr
                                                    key={index}
                                                    className="shadow-sm rounded-3"
                                                    style={{
                                                        transition: "all 0.2s ease-in-out",
                                                    }}
                                                >
                                                    <td className="text-muted">
                                                        {index + 1}
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
                                                                        Comments
                                                                    </p>
                                                                    {/* <p
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
                        </div>
                    </div>
                </div>

                 {/* Commnets Modal */}
                 <Modal
                    open={commentsOpen}
                    title={
                        <div className="d-flex align-items-center">
                            <i className="fa-solid fa-comments text-primary me-2"></i>
                            Ticket Comments
                        </div>
                    }
                    onCancel={() => setCommentsOpen(false)}
                    footer={null}
                    width={700}
                    centered
                >
                    <div className="card border-0 bg-light-primary mb-3">
                        <div className="card-body py-2 px-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                    <h6 className="fw-bold text-primary mb-0">
                                        {selectedTicket?.TicketCode}
                                    </h6>
                                    <span className="badge badge-light-success">
                                        {selectedTicket?.Status}
                                    </span>
                                    <span className="badge badge-light-warning">
                                        {selectedTicket?.Priority === 1
                                            ? "High"
                                            : selectedTicket?.Priority === 2
                                                ? "Medium"
                                                : "Low"}
                                    </span>
                                </div>
                                <small className="text-muted">
                                    Due: {formatDate(selectedTicket?.DueDate)}
                                </small>
                            </div>

                            <div className="row g-2">
                                <div className="col-md-6">
                                    <small className="text-muted fw-semibold d-block">
                                        Issue Type
                                    </small>
                                    <div className="fw-semibold">
                                        {selectedTicket?.IssueType || "-"}
                                    </div>
                                </div>
                                <div className="col-12">
                                    <small className="text-muted fw-semibold d-block">
                                        Description
                                    </small>
                                    <div className="text-gray-700">
                                        {selectedTicket?.Description || "-"}
                                    </div>
                                </div>
                            </div>
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
                                                {item.CreatedFrom === 1 ? "Portal" : "Technician"}
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
                            disabled={cmtSubmitLoading}
                        >
                            {cmtSubmitLoading ? (
                                <>
                                    <span
                                        className="spinner-border spinner-border-sm me-2"
                                        role="status"
                                        aria-hidden="true"
                                    ></span>
                                    {editingComment ? "Updating..." : "Submitting..."}
                                </>
                            ) : (
                                <>
                                    <i
                                        className={`fa-solid ${editingComment
                                                ? "fa-pen-to-square"
                                                : "fa-paper-plane"
                                            } me-2`}
                                    ></i>
                                    {editingComment ? "Update Comment" : "Submit Comment"}
                                </>
                            )}
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
        </Base1>
    )
}