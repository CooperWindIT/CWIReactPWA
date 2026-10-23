
import React, { useState, useEffect } from "react";
import Base1 from "../Config/Base1";
import { Tooltip, Modal, message, Mentions } from 'antd';
import '../Config/Pagination.css';
import '../Config/Loader.css';
import { Link, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../utils/api";
import { BASE_API, BASE_IMAGE_API_GET } from "../Config/Config";


export default function TrackTicket() {

    const navigate = useNavigate();

    const [sessionUserData, setSessionUserData] = useState([]);
    const [ticketsData, setTicketsData] = useState([]);
    const [selectedTicketCode, setSelectedTicketCode] = useState("");
    const [dataLoading, setDataLoading] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [usersData, setUsersData] = useState([]);
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

    const fetchTickets = async () => {
        if (!sessionUserData?.OrgId) return;
    
        if (!selectedTicketCode?.trim()) {
            message.warning("Please enter a Ticket Code.");
            return;
        }
    
        setDataLoading(true);
    
        try {
            const url =
                `${BASE_API}public/Getticketsbyemailid` +
                `?OrgId=${sessionUserData.OrgId}` +
                `&Type=Code` +
                `&TicketCode=${encodeURIComponent(selectedTicketCode.trim())}`;
    
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });
    
            const data = await response.json();
    
            console.log("Ticket Response:", data);
    
            if (response.ok) {
                const pageData = data?.ResultData || [];
                        
                setTicketsData(
                    Array.isArray(pageData) ? pageData : []
                );
            } else {
                console.error("Failed to fetch ticket:", data);
            
                setTicketsData([]);
            
                message.error(
                    data?.message || "Unable to fetch ticket details."
                );
            }
        } catch (error) {
            console.error("Error fetching ticket:", error);
    
            setTicketsData([]);
            message.error("Something went wrong while fetching the ticket.");
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && sessionUserData?.Id) {
            fetchDDLData();
        }
    }, [sessionUserData]);

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

        if (result.ResponseCode === 2002) {

            message.success(result.ResponseMessage);

            setCommentText("");

            setEditingComment(null);

            fetchComments(selectedTicket.Id);
            setCmtSubmitLoading(false);
        }
    };

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


    return (
        <Base1>
            <div
                id="kt_app_toolbar"
                className="app-toolbar py-4 py-lg-5"
            >
                <div
                    id="kt_app_toolbar_container"
                    className="app-container container-xxl d-flex flex-stack"
                    style={{
                        background: "linear-gradient(135deg, #ffffff 0%, #f7faff 100%)",
                        borderBottom: "1px solid #eef1f6",
                    }}
                >
                    <div className="page-title d-flex flex-column">
                        <Link
                            to="/user-modules"
                            className="text-muted text-hover-primary fw-semibold mb-3"
                            style={{
                                fontSize: "13px",
                                width: "fit-content",
                                textDecoration: "none",
                            }}
                        >
                            <i className="fa-solid fa-arrow-left me-2"></i>
                            Back to Modules
                        </Link>

                        <div className="d-flex align-items-center">
                            <div
                                className="d-flex align-items-center justify-content-center me-3"
                                style={{
                                    width: "52px",
                                    height: "52px",
                                    borderRadius: "14px",
                                    background:
                                        "linear-gradient(135deg, rgba(13,110,253,0.14), rgba(13,110,253,0.05))",
                                    border: "1px solid rgba(13,110,253,0.10)",
                                    boxShadow:
                                        "0 6px 18px rgba(13,110,253,0.08)",
                                }}
                            >
                                <i
                                    className="fa-solid fa-ticket"
                                    style={{
                                        fontSize: "21px",
                                        color: "#0d6efd",
                                    }}
                                ></i>
                            </div>
                            <div>
                                <div
                                    className="text-muted fw-semibold mb-1"
                                    style={{
                                        fontSize: "10px",
                                        letterSpacing: "0.5px",
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Service Requests
                                </div>
                                <h4
                                    className="fw-bold mb-0"
                                    style={{
                                        fontSize: "21px",
                                        color: "#181c32",
                                        letterSpacing: "-0.3px",
                                    }}
                                >
                                    Track Ticket
                                </h4>

                                <div
                                    className="text-muted mt-1"
                                    style={{ fontSize: "11px" }}
                                >
                                    Track and comment your submitted tickets
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        <Link
                            to="/service-requests/assetless"
                            className="d-flex align-items-center text-decoration-none"
                            style={{
                                height: "44px",
                                padding: "0 18px",
                                borderRadius: "12px",
                                background: "#ffffff",
                                border: "1px solid #e4e8ef",
                                color: "#0d6efd",
                                fontWeight: "600",
                                fontSize: "13px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
                                transition: "all 0.2s ease",
                            }}
                        >
                            <span
                                className="d-flex align-items-center justify-content-center me-2"
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "8px",
                                    background: "rgba(13,110,253,0.08)",
                                }}
                            >
                                <i className="fa-solid fa-list-check"></i>
                            </span>

                            Tickets List

                            <i
                                className="fa-solid fa-arrow-right ms-3"
                                style={{ fontSize: "11px" }}
                            ></i>
                        </Link>
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className={`app-content flex-column-fluid pt-2`}>
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card d-md-block d-none mt-1 mb-10 shadow-sm">
                        <div className="table-responsive">
                        <div
    className="card mb-4 border-0"
    style={{
        background: "linear-gradient(135deg, #ffffff 0%, #f5f9ff 100%)",
        borderRadius: "16px",
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
        overflow: "hidden"
    }}
>
    <div className="card-body p-4">

        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">

           

            {/* Right - Search */}
            <div
                className="d-flex align-items-center gap-2"
                style={{ minWidth: "340px" }}
            >
                <div className="position-relative flex-grow-1">
                    <i
                        className="fa-solid fa-magnifying-glass position-absolute text-muted"
                        style={{
                            left: "15px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            zIndex: 2
                        }}
                    ></i>

                    <input
                        type="text"
                        className="form-control ps-10"
                        placeholder="Enter Ticket Code"
                        value={selectedTicketCode}
                        onChange={(e) => setSelectedTicketCode(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                fetchTickets();
                            }
                        }}
                        style={{
                            height: "44px",
                            borderRadius: "10px",
                            border: "1px solid #d9e2f0",
                            backgroundColor: "#fff"
                        }}
                    />
                </div>

                <button
                    type="button"
                    className="btn btn-primary d-flex align-items-center justify-content-center"
                    onClick={fetchTickets}
                    disabled={dataLoading}
                    style={{
                        height: "44px",
                        padding: "0 20px",
                        borderRadius: "10px",
                        fontWeight: "600",
                        whiteSpace: "nowrap"
                    }}
                >
                    {dataLoading ? (
                        <>
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                            ></span>
                            Searching...
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-magnifying-glass me-2"></i>
                            Search
                        </>
                    )}
                </button>
            </div>

        </div>

    </div>
</div>
                            <div
                                style={{
                                    maxHeight: "500px",
                                    overflowY: "auto",
                                    overflowX: "auto",
                                }}
                                className="custom-scrollbar"
                            >
                                <table className="table align-middle table-hover gs-7 gy-5 mb-0 fs-6">
                                    <thead className="bg-light-primary">
                                        <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom-2 border-primary">
                                            <th className="">S.No</th>
                                            <th className="min-w-125px">Ticket Code</th>
                                            <th className="min-w-125px">Created On</th>
                                            <th className="min-w-205px">Sub-category</th>
                                            <th className="min-w-100px text-center">Priority</th>
                                            <th className="min-w-100px text-center">Status</th>
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
                                                            <span 
                                                             onClick={() => {
                                                                setSelectedTicket(item);
                                                                setCommentsOpen(true);
                                                            }}
                                                            className="btn btn-sm btn-info"
                                                            >
                                                           <i class="fa-regular fa-message"></i>comment
                                                            </span>
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
                                    <div className="text-muted" style={{ fontSize: "0.65rem" }}>Category</div>
                                    <div className="fw-semibold" style={{ fontSize: "0.78rem" }}>{selectedTicket?.ServiceType || "-"}</div>
                                </div>
                                <div className="col-4">
                                    <div className="text-muted" style={{ fontSize: "0.65rem" }}>Sub-category</div>
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