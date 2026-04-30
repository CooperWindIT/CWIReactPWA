
import React, { useState, useEffect } from "react";
import Base1 from "../../Config/Base1";
import { Form, Button, message, Upload, Select, Tooltip } from 'antd';
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import '../../Config/Pagination.css';
import Swal from 'sweetalert2';
import '../../Config/Loader.css';
import { Link, useNavigate } from "react-router-dom";
import RegisterTicket from "./Add";
import { InboxOutlined } from '@ant-design/icons';
import { useParams } from "react-router-dom";
import { fetchWithAuth } from "../../../utils/api";
import { MentionsInput, Mention } from "react-mentions";
import ReactDOM from "react-dom/client";
import EditTicket from "./Edit";
import CloseTicket from "./CloseTicket";
import AssignTechnician from "./AssignTech";


export default function EAMTicketView() {

    const navigate = useNavigate();
    const { Dragger } = Upload;
    const { orgId, ticketId } = useParams();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [approvedLoading, setApprovedLoading] = useState(false);
    const [reqSubmitLoading, setReqSubmitLoading] = useState(false);
    const [ticketDetails, setTicketDetails] = useState([]);
    const [ticketLogs, setTicketLogs] = useState([]);
    const [ticketComments, setTicketComments] = useState([]);
    const [ticketRequirements, setTicketRequirements] = useState([]);
    const [description, setDescription] = useState("");
    const [quantity, setQuantity] = useState("");
    const [heading, setHeading] = useState("");
    const [ticketUploadFiles, setTicketUploadFiles] = useState([]);
    const [resolvedDate, setResolvedDate] = useState("");
    const [resolutionDesc, setResolutionDesc] = useState("");
    const [closingLoading, setClosingLoading] = useState(false);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [enteredContent, setEnteredContent] = useState("");
    const [plainTextContent, setPlainTextContent] = useState("");
    const [commentSubmitLoading, setCommentSubmitLoading] = useState(false);
    const [dleteLoading, setDeleteLoading] = useState(false);
    const [mentionedEmails, setMentionedEmails] = useState("");
    const [returnedBy, setReturnedBy] = useState("");
    const [returnedOrg, setReturnedOrg] = useState("");
    const [pickupDate, setPickupDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [previewImage, setPreviewImage] = useState(null);
    const [handedTo, setHandedTo] = useState("");
    const [pickedBy, setPickedBy] = useState("");
    const [isDirectAssign, setIsDirectAssign] = useState(null);
    const [approveSubmitLoading, SetApproveSubmitLoading] = useState(null);
    const [assetTypeId, setAssetTypeId] = useState(null);
    const [closeData, setCloseData] = useState([]);
    const [editData, setEditData] = useState([]);
    const [ticketData, setTicketData] = useState([]);


    const maxFiles = 4;
    const { Option } = Select;

    const handleSaveAsDraft = () => {
        if (enteredContent && enteredContent.trim() !== "") {
            const draft = {
                content: enteredContent,           // markup string, like "Hey @(Qaviswa)[qaviswa@...]" 
                mentionedEmails: mentionedEmails, // array of emails
            };

            localStorage.setItem("machine_comment_draft", JSON.stringify(draft));
            message.success("Draft saved successfully!");
        } else {
            message.warning("Please enter some content before saving.");
        }
    };

    useEffect(() => {
        const saved = localStorage.getItem("machine_comment_draft");
        if (saved) {
            const parsed = JSON.parse(saved);
            setEnteredContent(parsed.content || "");      // must be markup string
            setMentionedEmails(parsed.mentionedEmails || []);
            const plainText = parsed.content
                ?.replace(/@\(([^)]+)\)\[[^\]]+\]/g, "@$1") // convert @(Name)[email] → @Name
                .replace(/\s+/g, " ")
                .trim();

            setPlainTextContent(plainText || "");
        }
    }, []);

    const handleChange = (event, newValue, newPlainTextValue, mentions) => {
        setEnteredContent(newValue);
        setPlainTextContent(newPlainTextValue); // plain readable text
        setMentionedEmails(mentions.map(m => m.id));
    };

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
            const sessionDDL = sessionStorage.getItem("ddlTechTicketViewData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);
                // Ensure you set the ALREADY formatted data or re-map it here
                setUsersData(parsed.users || []);
                return;
            }

            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                { method: "GET" }
            );

            const data = await response.json();

            const formattedUsers = data.ResultData
                .filter((item) => item.DDLName === "Users")
                .map(u => ({
                    id: u.DisplayValue?.trim(), // Fixed Key
                    display: u.ItemValue?.trim(), // Fixed Key
                }));

            setUsersData(formattedUsers);

            // Store the mapped version so 'id' and 'display' exist on reload
            sessionStorage.setItem(
                "ddlTechTicketViewData",
                JSON.stringify({ users: formattedUsers })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUsersData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchDDLData();
        }
    }, [sessionUserData]);

    const handleSubmit = async () => {

        if (!plainTextContent.trim()) {
            message.warning("Please enter a comment before submitting.");
            return;
        }
        setCommentSubmitLoading(true);

        const payload = {
            OrgId: sessionUserData.OrgId,
            Priority: 1,
            UserId: sessionUserData.Id,
            CommentType: "TICKETS",
            JsonData: {
                CommentText: plainTextContent,
                TablePrimaryId: ticketId, // replace dynamically if needed
                ToEmails: mentionedEmails.join(","), // 👈 comma separated string
            },
        };

        try {
            const response = await fetchWithAuth("Portal/AddNewComments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            setCommentSubmitLoading(false);
            if (response.ok && result.success) {
                message.success("Comment submitted successfully!");
                localStorage.removeItem("machine_comment_draft");
                fetchTicketData();
                setEnteredContent("");
                setMentionedEmails([]);
                setCommentSubmitLoading(false);
            } else {
                const err = await response.json();
                setCommentSubmitLoading(false);
                message.error(`Failed to submit comment: ${err.Message || response.statusText}`);
            }
        } catch (error) {
            console.error("Submit error:", error);
            setCommentSubmitLoading(false);
            message.error("Error submitting comment");
        }
    };

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

    const fetchTicketData = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/TicketOverView?TickId=${ticketId}&Id=${orgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                const resultData = data.ResultData;
                const ticketLogRows = resultData.filter(ticket => ticket.Title === 'Logs');
                const ticketCommentRows = resultData.filter(ticket => ticket.Title === 'TicketComments');
                const ticketUploadFileRows = resultData.filter(ticket => ticket.Title === 'UploadFiles');
                const ticketRequirementRows = resultData.filter(ticket => ticket.Title === 'Requirements');

                setTicketLogs(ticketLogRows);
                setTicketComments(ticketCommentRows);
                setTicketRequirements(ticketRequirementRows);
                setTicketUploadFiles(ticketUploadFileRows);

            } else {
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching mcn tickets data:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTicketDetails = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/GetTicketsBYId?TicketId=${ticketId}&OrgId=${orgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setTicketDetails(data.ResultData[0]);
                setResolutionDesc(data.ResultData[0]?.ResolutionSummary || "");
                setResolvedDate(
                    data.ResultData[0]?.ResolvedDate
                        ? data.ResultData[0].ResolvedDate.split("T")[0]
                        : ""
                );
            } else {
                setTicketDetails([]);
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            setTicketDetails([]);
            console.error('Error fetching mcn tickets data:', error.message);
        } finally {
            // setMcnTicketsLoading(false);
        }
    };

    useEffect(() => {
        if (ticketId && orgId) {
            fetchTicketData();
            fetchTicketDetails();
        }
    }, [ticketId, orgId]);

    const getFileType = (file) => {
        const type = file.type;

        if (type.includes("image")) return "IMAGE";
        if (type.includes("pdf")) return "PDF";
        if (type.includes("msword") || type.includes("vnd.openxmlformats-officedocument.wordprocessingml")) return "DOCX";
        if (type.includes("spreadsheetml") || type.includes("excel")) return "EXCEL";
        return "UNKNOWN";
    };

    const draggerProps = {
        multiple: false,
        customRequest: async ({ file, onSuccess, onError }) => {
            const MAX_FILE_SIZE_MB = 2;
            const fileSizeMB = file.size / (1024 * 1024); // Convert bytes to MB

            if (fileSizeMB > MAX_FILE_SIZE_MB) {
                Swal.fire({
                    icon: "warning",
                    title: "File Too Large",
                    text: "Please upload a file smaller than 2MB.",
                });
                onError("File too large");
                return;
            }
            if (ticketUploadFiles.length >= maxFiles) {
                Swal.fire({
                    icon: "warning",
                    title: "Upload Limit Reached",
                    text: "You can only upload up to 3 files.",
                });
                onError("Limit reached");
                return;
            }

            try {
                const formData = new FormData();
                formData.append("OrgId", sessionUserData?.OrgId);
                formData.append("TicketStatus", "FILESUPLOAD");
                formData.append("TicketId", ticketId);
                formData.append("UserId", sessionUserData?.Id);
                formData.append("Priority", ticketDetails?.Priority);

                const fileType = getFileType(file);
                formData.append("JsonData", JSON.stringify({ FileType: fileType }));
                formData.append("ImageUrl", file);

                const response = await fetchWithAuth(`file_upload/TicketsWorkFlow`, {
                    method: "POST",
                    body: formData, // ✅ Don't set Content-Type manually
                });

                const result = await response.json();

                if (result.success) {
                    onSuccess("Uploaded");

                    // Add to local list
                    setTicketUploadFiles((prev) => [...prev, { ...file, Col1: result.FilePath || file.name }]);
                    fetchTicketData();
                    if (result.data.result[0].ResponseCode === 2008) {
                        Swal.fire({
                            title: "Success",
                            text: result.data.result[0].Logs || "File has been uploaded successfully.",
                            icon: "success",
                        })
                    }
                } else {
                    onError("Failed");
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: result?.ResultData?.ResultMessage || "Something went wrong.",
                    });
                }
            } catch (err) {
                onError("Error");
                Swal.fire("Error", "Something went wrong while uploading.", "error");
            }
        },
        showUploadList: false,
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    };

    const handleApproved = async (item) => {

        setApprovedLoading(true);

        try {
            const formPayload = {
                OrgId: sessionUserData?.OrgId,
                Priority: ticketDetails?.Priority,
                TicketStatus: "ADDITIONAL REQUIREMENT APPROVED",
                TicketId: ticketId,
                UserId: sessionUserData?.Id,
                JsonData: {
                    TicketCreated: ticketDetails?.TicketCreated,
                    TicketCode: ticketDetails?.TicketCode,
                    MachineId: ticketDetails?.MachineId,
                    ReqId: item.Label,
                    CurrentStatus: ticketDetails?.Status,
                }
            }

            const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            if (result.success) {
                setApprovedLoading(false);
                if (result.data.result[0].ResponseCode === 2007) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Request has been approved successfully.",
                        icon: "success",
                    }).then(() => fetchTicketData());
                }
            } else {
                setApprovedLoading(false);
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData?.ResultMessage || "Something went wrong.",
                    icon: "error",
                });
            }
        } catch (error) {
            setApprovedLoading(false);
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setApprovedLoading(false);
        }
    };

    const formatDateToDDMMYYYY = (dateString) => {
        if (!dateString) return "";
        const [year, month, day] = dateString.split("-");
        return `${day}-${month}-${year}`;
    };

    const handlePickup = async (item) => {

        setLoading(true);
        try {
            const formPayload = {
                OrgId: sessionUserData?.OrgId,
                Priority: ticketDetails?.Priority,
                TicketStatus: "PICKED UP",
                TicketId: ticketId,
                UserId: sessionUserData?.Id,
                JsonData: {
                    Logs: `System Engineer ${pickedBy} picked up asset ${ticketDetails?.MachineName} for off-site repairon ${formatDateToDDMMYYYY(pickupDate)}.`,
                    TicketCode: ticketDetails?.TicketCode,
                    MachineId: ticketDetails?.MachineId
                }
            }

            const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            if (result.success) {
                setLoading(false);
                if (result.data.result[0].ResponseCode === 3001) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Request has been approved successfully.",
                        icon: "success",
                    }).then(() => fetchTicketData());
                }
            } else {
                setLoading(false);
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData?.ResultMessage || "Something went wrong.",
                    icon: "error",
                });
            }
        } catch (error) {
            setLoading(false);
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleReturned = async () => {
        setLoading(true);

        try {
            const formPayload = {
                OrgId: sessionUserData?.OrgId,
                Priority: ticketDetails?.Priority,
                TicketStatus: "RETURNED",
                TicketId: ticketId,
                UserId: sessionUserData?.Id,
                JsonData: {
                    Logs: `Asset ${ticketDetails?.MachineName} repaired and returned by ${returnedBy} on ${formatDateToDDMMYYYY(returnDate)}; handed over to associate ${handedTo}.`,
                    TicketCode: ticketDetails?.TicketCode,
                    MachineId: ticketDetails?.MachineId
                }
            }

            const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            if (result.success) {
                setLoading(false);
                if (result.data.result[0].ResponseCode === 3002) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Request has been approved successfully.",
                        icon: "success",
                    }).then(() => fetchTicketData());
                    setHandedTo("");
                    setReturnDate(null);
                    setReturnedBy("");
                    setReturnedOrg("");
                }
            } else {
                setLoading(false);
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData?.ResultMessage || "Something went wrong.",
                    icon: "error",
                });
            }
        } catch (error) {
            setLoading(false);
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddRequirement = async (e) => {
        e.preventDefault();
        setReqSubmitLoading(true);

        if (!heading || !description || !quantity) {
            setReqSubmitLoading(false);
            Swal.fire({
                title: "Invalid action",
                text: "Please enter all required fileds.",
                icon: "info",
                confirmButtonText: "OK"
            });
            return;
        }
        try {
            const formPayload = {
                OrgId: orgId,
                Priority: 1,
                TicketStatus: "ADDITIONAL REQUIREMENT APPROVAL",
                TicketId: ticketId,
                UserId: sessionUserData?.Id,
                JsonData: {
                    TicketCode: ticketDetails?.TicketCode,
                    MachineId: ticketDetails?.MachineId,
                    CurrentStatus: ticketDetails?.Status,
                    Requirements: [
                        {
                            RequirementName: heading,
                            Description: description,
                            Quantity: quantity,
                        }
                    ]
                }
            }

            const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            if (result.success) {
                setReqSubmitLoading(false);
                if (result.data.result[0].ResponseCode === 2006) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Request has been raised successfully.",
                        icon: "success",
                    }).then(() => {
                        fetchTicketData();
                        setDescription('');
                        setQuantity('');
                        setHeading('');
                    });
                }
            } else {
                setReqSubmitLoading(false);
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData?.ResultMessage || "Something went wrong.",
                    icon: "error",
                });
            }
        } catch (error) {
            setReqSubmitLoading(false);
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setReqSubmitLoading(false);
        }
    };

    const handleDeleteRequirement = async (item) => {
        const confirmation = await Swal.fire({
            title: "Are you sure?",
            text: `Do you want to delete the requirement: "${item.Col1}"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "No, cancel",
        });

        // If user confirmed
        if (confirmation.isConfirmed) {

            try {
                const formPayload = {
                    ReqId: item.Label,
                    TicketId: ticketId,
                    UserId: sessionUserData?.Id,
                    RequirementName: item.Col1,
                };

                const response = await fetchWithAuth(`PMMS/InactiveTicketRequirements`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formPayload),
                });

                const result = await response.json();

                if (result.ResultData[0].Status === 'true') {
                    // Swal.fire({
                    //     title: "Success",
                    //     text: "Requirement deleted successfully.",
                    //     icon: "success",
                    // }).then(() => {
                    fetchTicketData();
                    // });
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
                setReqSubmitLoading(false);
            }
        }
    };

    const handleDeleteFile = async (item) => {
        const confirmation = await Swal.fire({
            title: "Are you sure?",
            text: `Do you want to delete the file: "${item.Col1}"?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
            cancelButtonText: "No, cancel",
        });

        // If user confirmed
        if (confirmation.isConfirmed) {

            try {
                const formPayload = {
                    FilePath: item.Col1,
                    FileId: item.Label,
                    CreatedBy: sessionUserData?.Id,
                };

                const response = await fetchWithAuth(`PMMS/InactiveTicketFiles`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formPayload),
                });

                const result = await response.json();

                if (result.ResultData.Status === 'Success') {
                    Swal.fire({
                        title: "Success",
                        text: `${"File deleted successfully."}`,
                        icon: "success",
                    }).then(() => {
                        fetchTicketData();
                    });
                } else {
                    Swal.fire({
                        title: "Error",
                        text: "Something went wrong.",
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
                setReqSubmitLoading(false);
            }
        }
    };

    const handleResolvedTicket = async (e) => {
        e.preventDefault();

        if (!resolvedDate && !resolutionDesc) {
            Swal.fire("Required", "Please enter resolved date and description", "warning");
            return;
        }

        setClosingLoading(true);

        const payload = {
            OrgId: sessionUserData?.OrgId,
            Priority: ticketDetails?.Priority,
            TicketStatus: "RESOLVED",
            TicketId: ticketId,
            UserId: sessionUserData?.Id,
            JsonData: {
                ResolutionSummary: resolutionDesc,
                MachineId: ticketDetails?.MachineId,
                ResolvedDate: resolvedDate,
                TicketCode: ticketDetails?.TicketCode,
            }
        };

        try {
            const res = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success) {
                if (data.data.result[0].ResponseCode === 2009) {
                    Swal.fire({
                        title: "Success",
                        text: data.data.result[0].Logs || "Ticket has been resolved successfully.",
                        icon: "success",
                    }).then(() => fetchTicketData(), fetchTicketDetails());
                }
            } else {
                Swal.fire("Error", data?.ResultData?.ResultMessage || "Resolving failed", "error");
            }
        } catch (err) {
            Swal.fire("Error", "Something went wrong", "error");
        } finally {
            setClosingLoading(false);
        }
    };

    const handleFormattedInput = (value, setValue) => {
        // 1. Disallow leading space
        if (value.length === 1 && value === ' ') return;

        // 2. Filter allowed characters (Letters, numbers, spaces, and periods)
        // Note: Added '.' to the regex so users can actually type a period
        if (/[^a-zA-Z0-9 .]/.test(value)) return;

        // 3. Formatting Logic:
        let formatted = value.toLowerCase();

        // Capitalize the very first character if it's a letter
        if (formatted.length > 0 && /^[a-z]/.test(formatted)) {
            formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
        }

        // Capitalize after period + space (Sentence casing)
        // Regex explanation: Matches a period, followed by one or more spaces, followed by a letter
        formatted = formatted.replace(/\.\s+[a-z]/g, (match) => match.toUpperCase());

        setValue(formatted);
    };

    const getAvatarColor = (name) => {
        const pastelColors = [
            "#FADADD", // light pink
            "#D1E7DD", // mint green
            "#E0E7FF", // light lavender
            "#FFF3CD", // pale yellow
            "#DDEAF6", // light blue
            "#FDE2E4", // rose pink
            "#E3F2FD", // light sky
            "#FFEFD5", // peach
            "#F8EDEB", // blush
        ];

        if (!name) return pastelColors[0];
        const index = name.charCodeAt(0) % pastelColors.length;
        return pastelColors[index];
    };

    const highlightMentions = (text) => {
        if (!text) return "";

        // Match @ followed by letters, numbers, underscore (common mention format)
        const mentionRegex = /(@[a-zA-Z0-9_]+)/g;

        // Wrap each @mention with a span for styling
        return text.replace(mentionRegex, `<span class="mention-highlight">$1</span>`);
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "new":
                return "badge-light-primary";
            case "modified":
                return "badge-light-warning";
            case "approved":
                return "badge-light-info";
            case "assigned":
                return "badge-light-teal"; // 🌿 softer teal tone
            case "additional requirement approval":
                return "badge-light-blue";
            case "additional requirement approved":
                return "badge-light-skyblue";
            case "req deleted":
                return "badge-light-pink"; // ❌ soft pink/red
            case "picked up":
                return "badge-light-indigo"; // 💜 subtle indigo tone
            case "returned":
                return "badge-light-brown"; // 🪵 muted earthy tone
            case "filesupload":
                return "badge-light-gold"; // 🟡 gentle gold tone for upload
            case "resolved":
                return "badge-light-purple";
            case "closed":
                return "badge-light-success";
            default:
                return "badge-light-gray";
        }
    };

    // #region Status modifications func
    const handleApproveClick = (item) => {
        setAssetTypeId(item.TypeId);
        setIsDirectAssign(item.DirectAssign);

        const state = {
            selectedUser: null
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

                const ApprovalContent = () => {
                    return (
                        <div style={{ textAlign: "left" }}>
                            <p className="mb-3"><strong>Ticket:</strong> {item?.TicketCode || item?.Col2}</p>

                            <label className="form-label fw-bold">Select Internal Employee</label>
                            <Select
                                showSearch
                                placeholder="Search Employee..."
                                className="w-100"
                                dropdownStyle={{ zIndex: 20000 }}
                                optionFilterProp="label"
                                onChange={(id) => {
                                    // Match the key 'id' from your sample data
                                    state.selectedUser = usersData.find((u) => u.id === id);
                                }}
                                options={usersData.map(user => ({
                                    // Map 'display' to label and 'id' to value
                                    label: user.display,
                                    value: user.id,
                                }))}
                            />
                        </div>
                    );
                };

                root.render(<ApprovalContent />);
            },
            preConfirm: () => {
                if (!state.selectedUser) {
                    Swal.showValidationMessage(`Please select an employee!`);
                    return false;
                }
                // Return the object containing id and display
                return state.selectedUser;
            },
        }).then((result) => {
            if (result.isConfirmed) {
                handleApproveSubmit(result.value, item);
            }
        });
    };

    const handleApproveSubmit = async (selectedUser, item) => {
        SetApproveSubmitLoading(true);

        // From your sample: id is the email, display is the name
        const displayName = selectedUser.display;
        const userEmail = selectedUser.id;

        Swal.fire({
            title: 'Confirm Approval',
            text: `Assigning ${displayName} to Ticket ${item.TicketCode}. Proceed?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Proceed',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const formPayload = {
                        OrgId: sessionUserData?.OrgId,
                        Priority: item.Priority,
                        TicketStatus: "APPROVED",
                        TicketId: ticketId,
                        UserId: sessionUserData?.Id,
                        JsonData: {
                            MachineId: item.MachineId,
                            TicketCode: item.TicketCode,
                            AssignedEmail: userEmail,
                            AssignedUser: displayName,
                            DueDate: ticketDetails.DueDate,
                            AssignedId: selectedUser.ItemId,
                        }
                    };

                    const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formPayload),
                    });

                    const resultData = await response.json();

                    if (resultData.success) {
                        Swal.fire("Success", "Ticket assigned successfully", "success")
                            .then(() => { fetchTicketDetails(); fetchTicketData() });
                    } else {
                        throw new Error(resultData?.ResultData?.ResultMessage || "Submission failed");
                    }
                } catch (error) {
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
            text: `Do you want to reject ticket: ${item?.TicketCode}?`,
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
                        TicketId: ticketId,
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
                        }).then(() => { fetchTicketDetails(); fetchTicketData() });

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
                            fetchTicketDetails();
                            fetchTicketData();
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

    const handleEdit = (item) => {
        setEditData(item);
    };

    const handleCloseTicket = (item) => {
        setCloseData(item);
    };

    const handleAssignTech = (item) => {
        setTicketData(item);
    };

    // const steps = ticketDetails?.DirectAssign
    // ? ["NEW", "APPROVED", "ASSIGNED", "PICKED UP", "RETURNED", "TECH_FIXED", "RESOLVED", "CLOSED"]
    // : ["NEW", "APPROVED", "ASSIGNED", "PICKED UP", "RETURNED", "RESOLVED", "CLOSED"];

    // const activeStepIndex =
    //     ticketDetails?.Status === "PENDING_WITH_CLIENT"
    //         ? steps.indexOf("APPROVED")
    //         : steps.indexOf(ticketDetails?.Status);

    const normalizeStep = (value) => String(value || "").trim().toUpperCase();

    const steps = ticketDetails?.DirectAssign
        ? ["NEW", "APPROVED", "ASSIGNED", "PICKED UP", "RETURNED", "TECH_FIXED", "RESOLVED", "CLOSED"]
        : ["NEW", "APPROVED", "ASSIGNED", "PICKED UP", "RETURNED", "RESOLVED", "CLOSED"];

    const currentStatusForStepper =
        ticketDetails?.Status === "PENDING_WITH_CLIENT"
            ? "NEW"
            : ticketDetails?.Status;

    const activeStepIndex = steps.indexOf(normalizeStep(currentStatusForStepper));

    const enabledStepSet = new Set(
        (ticketLogs || [])
            .map((item) => normalizeStep(item.Label))
            .filter(Boolean)
    );

    // also keep current visible in stepper
    if (currentStatusForStepper) {
        enabledStepSet.add(normalizeStep(currentStatusForStepper));
    }

    const permissionsByStatus = {
        edit: ["CLOSED"],
        delete: ["NEW", "MODIFIED", "REJECTED"],
        approve: ["NEW", "REJECTED", "MODIFIED"],
        reject: ["NEW", "MODIFIED"],
        assignTech: ["NEW", "APPROVED"],
        close: ["RESOLVED"],
    };

    const showDeleteBtn = sessionActionIds?.includes(11);
    const showReqApproveBtn = sessionActionIds?.includes(12);
    const showResolveBtn = sessionActionIds?.includes(13);
    const ShowPickupBtn = sessionActionIds?.includes(20);

    const showEditBtn = sessionActionIds?.includes(3);
    const showApproveBtn = sessionActionIds?.includes(4);
    const showRejectBtn = sessionActionIds?.includes(5);
    const showAssignTechBtn = sessionActionIds?.includes(8);
    const showCloseBtn = sessionActionIds?.includes(10);

    const canEdit = showEditBtn && !permissionsByStatus.edit.includes(ticketDetails?.Status);
    const canDelete = showDeleteBtn && permissionsByStatus.delete.includes(ticketDetails?.Status);
    const canApprove = showApproveBtn &&
        permissionsByStatus.approve.includes(ticketDetails?.Status) &&
        !ticketDetails?.DirectAssign;
    const canReject = showRejectBtn && permissionsByStatus.reject.includes(ticketDetails?.Status);
    const canAssignTech = (showAssignTechBtn) && (
        (ticketDetails?.Status === 'NEW' && ticketDetails?.DirectAssign === true) ||
        (ticketDetails?.Status === 'APPROVED') ||
        (!['NEW', 'APPROVED'].includes(ticketDetails?.Status) && permissionsByStatus.assignTech.includes(ticketDetails?.Status))
    );
    const canClose = showCloseBtn && permissionsByStatus.close.includes(ticketDetails?.Status);

    const allowedStatuses = [
        "ASSIGNED",
        "RETURNED",
        "ADDITIONAL REQUIREMENT APPROVED",
        "TECH_FIXED",
    ];

    const isSubmitDisabled =
        !allowedStatuses.includes(ticketDetails?.Status) ||
        closingLoading ||
        !showResolveBtn;

    const handleReAssignTech = async () => {
        const result = await Swal.fire({
            title: "Re-Assign Technician?",
            text: "Are you sure you want to re-assign this ticket to another technician?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-check-circle text-white me-2"></i>Yes, Re-Assign',
            cancelButtonText: '<i class="bi bi-x-circle text-white me-2"></i>No, Cancel',
            confirmButtonColor: "#009ef7",
            cancelButtonColor: "#6c757d",
            reverseButtons: true,
        });

        if (!result.isConfirmed) return;

        const payload = {
            OrgId: sessionUserData?.OrgId,
            Priority: 1,
            TicketStatus: "RE_ASSIGNED",
            TicketId: ticketDetails?.TicketId,
            UserId: sessionUserData?.Id,
            JsonData: {
                TicketId: ticketDetails?.Id,
                MachineId: ticketDetails?.MachineId,
            },
        };

        try {
            Swal.showLoading();

            const res = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            const responseCode = data?.data?.result?.[0]?.ResponseCode;

            if (data?.success && responseCode === 3005) {
                fetchTicketDetails();
                Swal.fire("Success", "Ticket reassigned successfully.", "success");
            } else {
                Swal.fire("Error", "Failed to reassign technician.", "error");
            }
        } catch (error) {
            Swal.fire("Error", "Server error", "error");
        }
    };


    return (
        <Base1>

            <div id="kt_app_content" className="app-content flex-column-fluid">
                <div id="kt_app_content_container" className={`app-container container-xxl ${loading ? 'blurred' : ''}`}>
                    {loading && (
                        <div className="loading-overlay">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    )}
                    <div className="card">
                        <div className="card-body pt-0">
                            <div className="mt-4">
                                {/* Header */}
                                <div className="card-title w-100">
                                    <div className="d-flex d-lg-none justify-content-between align-items-center flex-wrap mb-2">
                                        <div className="d-flex align-items-center gap-2">
                                            <h5 className="mb-0">
                                                Ticket History <span className="text-primary">({ticketDetails?.TicketCode})</span>
                                            </h5>
                                        </div>

                                        <Link to={`/eam/tickets`}>
                                            <span
                                                className={`badge badge-secondary border border-dark`}
                                                style={{
                                                    fontSize: "0.95rem",
                                                    padding: "8px 14px",
                                                    borderRadius: "20px",
                                                    fontWeight: 700,
                                                    letterSpacing: "0.5px",
                                                }}
                                            >
                                                <i className="fa-solid fa-arrow-left me-1"></i> Back to Tickets
                                            </span>
                                        </Link>
                                    </div>

                                    <div className="text-center d-lg-none mb-2">
                                        <h1
                                            className="mb-0"
                                            style={{
                                                fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                                fontWeight: 600,
                                                color: "#4B49AC",
                                                letterSpacing: "1px",
                                                textTransform: "uppercase",
                                                fontSize: "clamp(1.3rem, 5vw, 2rem)",
                                            }}
                                        >
                                            {ticketDetails?.MachineName}
                                        </h1>
                                    </div>

                                    <div className="d-none d-lg-flex justify-content-between align-items-center flex-wrap gap-3">
                                        <div className="d-flex align-items-center gap-2">
                                            <h3 className="mb-0">
                                                Ticket History <span className="text-primary">({ticketDetails?.TicketCode})</span>
                                            </h3>
                                        </div>

                                        <div className="flex-grow-1 text-center">
                                            <h1
                                                className="mb-0"
                                                style={{
                                                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                                    fontWeight: 600,
                                                    color: "#4B49AC",
                                                    letterSpacing: "1px",
                                                    textTransform: "uppercase",
                                                    fontSize: "clamp(1.5rem, 3vw, 2.5rem)",
                                                }}
                                            >
                                                {ticketDetails?.MachineName}
                                            </h1>
                                        </div>

                                        <div>
                                            <Link to={`/eam/tickets`}>
                                                <span
                                                    className={`badge badge-secondary border border-dark`}
                                                    style={{
                                                        fontSize: "0.95rem",
                                                        padding: "8px 14px",
                                                        borderRadius: "20px",
                                                        fontWeight: 700,
                                                        letterSpacing: "0.5px",
                                                    }}
                                                >
                                                    <i className="fa-solid fa-arrow-left mt-1 me-1"></i> Back to Tickets
                                                </span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center w-100 mt-3 gap-3">
                                    {ticketDetails?.Status === "PENDING_WITH_CLIENT" && (
                                        <div className="order-1 order-lg-1 w-100">
                                            <span className="badge badge-light-warning text-dark fw-bold px-4 py-3 rounded-pill shadow-sm d-inline-flex align-items-center border border-warning">
                                                <i class="fa-solid fa-triangle-exclamation text-warning fa-beat-fade me-2"></i>
                                                Action Pending From Client
                                            </span>
                                        </div>
                                    )}

                                    <div className="order-2 order-lg-2 d-flex justify-content-end w-100">
                                        <div className="d-flex align-items-center flex-wrap gap-3 mt-0">
                                            <div className="btn-group shadow-sm bg-white rounded-pill p-1 border flex-wrap">
                                                <button
                                                    className="btn btn-sm btn-light-info border-0 rounded-pill px-4 fw-bold mx-1"
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightEdit"
                                                    aria-controls="offcanvasRightEdit"
                                                    onClick={() => canEdit && handleEdit(ticketDetails)}
                                                    disabled={!canEdit}
                                                >
                                                    <i className="fa-regular fa-pen-to-square me-1"></i>
                                                    <span className="d-none d-md-inline">Edit</span>
                                                </button>

                                                {ticketDetails?.Status !== "PENDING_WITH_CLIENT" && (
                                                    <button
                                                        className="btn btn-sm btn-light-primary border-0 rounded-pill px-4 fw-bold mx-1"
                                                        data-bs-toggle="offcanvas"
                                                        data-bs-target="#offcanvasRightAssignTech"
                                                        aria-controls="offcanvasRightAssignTech"
                                                        onClick={() => canAssignTech && handleAssignTech(ticketDetails)}
                                                        disabled={!canAssignTech}
                                                    >
                                                        <i className="bi bi-person-gear fs-5 me-1"></i>
                                                        <span className="d-none d-md-inline">Assign Tech</span>
                                                    </button>
                                                )}

                                                {ticketDetails?.Status === "PENDING_WITH_CLIENT" && (
                                                    <button
                                                        className="btn btn-sm btn-light-primary border-0 rounded-pill px-4 fw-bold mx-1"
                                                        onClick={handleReAssignTech}
                                                    >
                                                        <i className="bi bi-person-gear fs-5 me-1"></i>
                                                        <span className="d-none d-md-inline">Re-Assign Tech</span>
                                                    </button>
                                                )}

                                                <button
                                                    className={`btn btn-sm btn-light-success border-0 rounded-pill px-4 fw-bold mx-1 ${!canApprove ? "d-none" : "d-block"}`}
                                                    title={ticketDetails?.DirectAssign ? "Cannot approve: This is a Direct Assignment" : ""}
                                                    onClick={() => handleApproveClick(ticketDetails)}
                                                    disabled={!canApprove}
                                                    style={{
                                                        cursor: canApprove ? "pointer" : "not-allowed",
                                                        opacity: canApprove ? 1 : 0.5,
                                                        transition: "all 0.3s ease"
                                                    }}
                                                >
                                                    <i className="bi bi-check2-all me-1"></i>
                                                    <span className="d-none d-md-inline">Approve</span>
                                                </button>

                                                <button
                                                    className="btn btn-sm btn-light-warning border-0 rounded-pill px-4 fw-bold mx-1"
                                                    onClick={() => canReject && handleReject(ticketDetails)}
                                                    disabled={!canReject}
                                                >
                                                    <i className="fa-solid fa-ban me-1"></i>
                                                    <span className="d-none d-md-inline">Reject</span>
                                                </button>

                                                <button
                                                    className="btn btn-sm btn-light-success border-0 rounded-pill px-4 fw-bold mx-1"
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightCloseTic"
                                                    aria-controls="offcanvasRightCloseTic"
                                                    onClick={() => canClose && handleCloseTicket(ticketDetails)}
                                                    disabled={!canClose}
                                                >
                                                    <i className="bi bi-clipboard2-check me-1"></i>
                                                    <span className="d-none d-md-inline">Close</span>
                                                </button>

                                                <button
                                                    className="btn btn-sm btn-light-danger border-0 rounded-pill px-4 fw-bold mx-1"
                                                    onClick={() => canDelete && handleDeleteTicket(ticketDetails)}
                                                    disabled={!canDelete}
                                                >
                                                    <i className="fa-regular fa-trash-can me-1"></i>
                                                    <span className="d-none d-md-inline">Delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                {/* Steps */}
                                <div className="step-container d-flex justify-content-between align-items-center w-100 my-4 pt-2">
                                    {steps.map((step, index) => {
                                        const normalizedStep = normalizeStep(step);
                                        const isEnabled = enabledStepSet.has(normalizedStep);
                                        const isFilled = isEnabled && index <= activeStepIndex;
                                        const isActive = isEnabled && index === activeStepIndex;
                                        const isMasked = !isEnabled;

                                        return (
                                            <div key={step} className="text-center flex-fill position-relative">
                                                <div
                                                    className={`step-circle-horizontal mx-auto
                        ${isFilled ? "filled" : ""}
                        ${isActive ? "active" : ""}
                        ${isMasked ? "opacity-50 bg-light text-muted border" : ""}
                    `}
                                                >
                                                    {isMasked ? <i className="bi bi-x-lg"></i> : index + 1}
                                                </div>

                                                {index !== steps.length - 1 && (
                                                    <div
                                                        className={`step-line-horizontal ${isEnabled && index < activeStepIndex ? "filled" : ""
                                                            } ${isMasked ? "opacity-25" : ""}`}
                                                    ></div>
                                                )}

                                                <div className={`step-label mt-2 fw-semibold ${isMasked ? "text-muted" : ""}`}>
                                                    {step}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Ticekt Logs started */}
                                <div className="row">
                                    <div className="col-12 col-md-10 order-2 order-md-1">
                                        <div className="table-responsive card shadow-sm border-0 px-3 pb-3 rounded-3 custom-table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
                                            <table className="table table-hover align-middle mt-3 mb-0">
                                                <thead className="table-light sticky-top" style={{ zIndex: 1 }}>
                                                    <tr className="text-center text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                                        <th style={{ minWidth: "100px" }}>When</th>
                                                        <th style={{ minWidth: "200px" }}>Action</th>
                                                        <th style={{ minWidth: "200px" }}>Status</th>
                                                        <th style={{ minWidth: "120px" }}>Performed By</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Array.isArray(ticketLogs) && ticketLogs.length > 0 ? (
                                                        ticketLogs.map((item, indx) => (
                                                            <tr key={indx} className="transition-row">
                                                                <td className="text-primary fw-semibold text-center fs-7">
                                                                    <i className="bi bi-clock-history me-1 opacity-50"></i>
                                                                    {formatDate(item.Col2)}
                                                                </td>

                                                                <td className="fw-semibold fs-7 text-dark text-nowrap overflow-hidden" style={{ maxWidth: '250px' }}>
                                                                    <Tooltip title={item.Col1} placement="topLeft">
                                                                        <span className="text-truncate d-block cursor-help">
                                                                            {item.Col1 || "N/A"}
                                                                        </span>
                                                                    </Tooltip>
                                                                </td>

                                                                <td>
                                                                    <span
                                                                        className={`badge ${getStatusBadgeClass(item.Label)} d-flex align-items-center justify-content-center mx-auto rounded-pill py-2 fw-bold`}
                                                                        style={{ width: '194px', fontSize: '0.7rem' }}
                                                                    >
                                                                        <i className="bi bi-dot fs-4"></i>
                                                                        {item.Label}
                                                                    </span>
                                                                </td>

                                                                <td className="fw-semibold text-info text-start">
                                                                    <div className="d-inline-flex align-items-start justify-content-start w-100">
                                                                        <i className="bi bi-person-circle me-2 flex-shrink-0"></i>
                                                                        {item.Col3 && item.Col3.length > 5 ? (
                                                                            <Tooltip title={item.Col3} placement="top">
                                                                                <span
                                                                                    className="text-truncate cursor-pointer"
                                                                                    style={{ maxWidth: "100px", display: "inline-block" }}
                                                                                >
                                                                                    {item.Col3}
                                                                                </span>
                                                                            </Tooltip>
                                                                        ) : (
                                                                            <span>{item.Col3 || "N/A"}</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={4} className="text-center py-5 text-muted">
                                                                <i className="bi bi-inbox fs-2 d-block mb-2 opacity-25"></i>
                                                                No logs found
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        <hr className="text-primary" />

                                        {/* Comments */}
                                        <div className="card shadow-sm border-0 p-3 rounded-3">
                                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 text-primary mb-3">
                                                <i className="fa-solid fa-comment-dots"></i>
                                                Comments <span className="badge bg-light-primary">{ticketComments?.length || 0}</span>
                                                <Tooltip
                                                    placement="top"
                                                    title={
                                                        <div style={{ maxWidth: 260 }}>
                                                            Comments are visible to all users who have access to this ticket.
                                                            <br /><br />
                                                            You can use <b>@</b> to mention users in your organization.
                                                            Mentioned users will receive an email notification along with the comment message.
                                                        </div>
                                                    }
                                                >
                                                    <i className="fa-solid fa-circle-info text-gray-400 fs-6 cursor-help"></i>
                                                </Tooltip>
                                            </h5>

                                            {/* <div className="comments-chat rounded">
                                                {ticketComments?.map((comment, indx) => {
                                                    const isCurrentUser = comment.Col2 == sessionUserData?.Id;
                                                    const displayName = isCurrentUser ? "You" : comment.Label;

                                                    return (
                                                        <div key={indx} className="formal-comment-item d-flex mb-3">
                                                            <div
                                                                className="avatar-circle me-3"
                                                                style={{
                                                                    backgroundColor: getAvatarColor(comment?.Label),
                                                                    color: "#333",
                                                                    fontWeight: "bold",
                                                                }}
                                                            >
                                                                {comment?.Label?.charAt(0)?.toUpperCase()}
                                                            </div>

                                                            <div className="comment-content">
                                                                <div className="comment-header d-flex align-items-center gap-2">
                                                                    <span className="comment-name fw-semibold">{displayName}</span>
                                                                    <span className="text-muted">Created On: </span>
                                                                    <span className="comment-time text-primary small">
                                                                        {comment.Col3 || "Just now"}
                                                                    </span>
                                                                </div>

                                                                <div
                                                                    className="comment-text mt-1"
                                                                    dangerouslySetInnerHTML={{ __html: highlightMentions(comment.Col1) }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div> */}
                                            <div className="comments-chat d-flex flex-column gap-4 p-4 bg-gray-100 rounded shadow-inner" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                                {ticketComments?.map((comment, indx) => {
                                                    const isCurrentUser = comment.Col2 == sessionUserData?.Id;
                                                    const displayName = isCurrentUser ? "You" : comment.Label;

                                                    return (
                                                        <div
                                                            key={indx}
                                                            className={`d-flex ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
                                                        >
                                                            <div
                                                                className="avatar-circle shadow-sm flex-shrink-0"
                                                                style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '50%',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    backgroundColor: getAvatarColor(comment?.Label),
                                                                    color: "#fff",
                                                                    fontWeight: "bold",
                                                                    fontSize: '11px',
                                                                    marginLeft: isCurrentUser ? '12px' : '0',
                                                                    marginRight: isCurrentUser ? '0' : '12px',
                                                                    marginTop: 'auto' // Aligns avatar to the bottom of the bubble
                                                                }}
                                                            >
                                                                {comment?.Label?.charAt(0)?.toUpperCase()}
                                                            </div>

                                                            <div
                                                                className={`p-3 shadow-xs border ${isCurrentUser
                                                                    ? 'bg-light-primary border-primary border-opacity-25'
                                                                    : 'bg-white border-gray-300'
                                                                    }`}
                                                                style={{
                                                                    maxWidth: '75%',
                                                                    borderRadius: isCurrentUser ? '16px 16px 0px 16px' : '16px 16px 16px 0px',
                                                                }}
                                                            >
                                                                <div className="d-flex align-items-center mb-1 gap-3">
                                                                    <span className={`fw-bold fs-8 ${isCurrentUser ? 'text-primary' : 'text-gray-700'}`}>
                                                                        {displayName}
                                                                    </span>
                                                                    <span className="text-muted" style={{ fontSize: '10px' }}>
                                                                        {comment.Col3 || "Just now"}
                                                                    </span>
                                                                </div>

                                                                <div
                                                                    className="comment-text text-gray-800 fs-7"
                                                                    style={{
                                                                        wordBreak: 'break-word',
                                                                        lineHeight: '1.4'
                                                                    }}
                                                                    dangerouslySetInnerHTML={{ __html: highlightMentions(comment.Col1) }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="col-12">
                                                <Form layout="vertical">
                                                    <Form.Item>
                                                        <MentionsInput
                                                            value={enteredContent}
                                                            onChange={handleChange}
                                                            placeholder="Type @ to mention a user..."
                                                            className="mentions"
                                                        >
                                                            <Mention
                                                                trigger="@"
                                                                data={usersData}
                                                                displayTransform={(id, display) => `@${display}`}
                                                                // markup="@__display__"
                                                                markup="@(__display__)[__id__]"
                                                                appendSpaceOnAdd={true}
                                                                style={{ backgroundColor: "#eef5ff" }}
                                                                renderSuggestion={(entry, search, highlightedDisplay) => (
                                                                    <div className="mention-suggestion-item">
                                                                        {highlightedDisplay} <small className="text-muted">{entry.id}</small>
                                                                    </div>
                                                                )}
                                                                // This makes matching case-insensitive
                                                                isValidSearchTerm={(term) => !!term && term.length > 0}
                                                            />
                                                        </MentionsInput>
                                                    </Form.Item>

                                                    <div className="d-flex justify-content-end">
                                                        <Button type="default" className="me-2" onClick={handleSaveAsDraft}>
                                                            <i className="bi bi-bookmark-check"></i>Save as Draft
                                                        </Button>
                                                        <Button type="primary" onClick={handleSubmit} disabled={commentSubmitLoading || !enteredContent.trim()}>
                                                            <i className="bi bi-chat-left-text text-white"></i>{commentSubmitLoading ? 'Submitting...' : 'Comment'}
                                                        </Button>
                                                    </div>
                                                </Form>
                                            </div>
                                        </div>

                                        <hr className="text-primary" />

                                        {/* Pickup & Drop */}
                                        {(ticketDetails?.Status === 'APPROVED' || ticketDetails?.Status === 'PICKED UP') &&
                                            <div className="card shadow-sm border-0 p-3 rounded-3 mt-3">
                                                <div className="d-flex align-items-center justify-content-between mb-3">
                                                    <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 text-primary">
                                                        <i className="fa-solid fa-truck-fast"></i>
                                                        Pickup/Return
                                                        <Tooltip
                                                            title="If the asset needs to be sent out for fixing the issue to a technician, use this pickup and drop functionality for these assets."
                                                            placement="top"
                                                        >
                                                            <i
                                                                className="fa-solid fa-circle-info text-gray-400"
                                                                style={{ cursor: 'help', fontSize: '14px' }}
                                                            ></i>
                                                        </Tooltip>
                                                    </h5>
                                                </div>
                                                <div className="row g-3 mb-3 align-items-end">
                                                    <div className="col-12 col-md-2">
                                                        <label className="form-label fw-semibold">
                                                            Pickup Date<span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="form-control form-control-sm"
                                                            value={pickupDate}
                                                            onChange={(e) => setPickupDate(e.target.value)}
                                                            disabled={ticketDetails?.Status !== "APPROVED"}
                                                            title={
                                                                ticketDetails?.Status !== "APPROVED"
                                                                    ? "Pickup date can only be set once the ticket get approved."
                                                                    : ""
                                                            }
                                                        />
                                                    </div>
                                                    <div className="col-12 col-md-3">
                                                        <label className="form-label fw-semibold">
                                                            Picked by (Engineer)<span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Enter engineer name"
                                                            value={pickedBy}
                                                            onChange={(e) => setPickedBy(e.target.value)}
                                                            disabled={ticketDetails?.Status !== "APPROVED"}
                                                        />
                                                    </div>
                                                    <div className="col-12 col-md-2">
                                                        <label className="form-label fw-semibold d-block">
                                                            Uplaod DC File<span className="text-danger">*</span>
                                                        </label>
                                                        <Dragger
                                                            {...draggerProps}
                                                            disabled={ticketDetails?.Status !== "APPROVED"}
                                                            showUploadList={false}
                                                            style={{
                                                                width: 200,
                                                                height: 10,
                                                                border: "1px dashed #d9d9d9",
                                                                borderRadius: 8,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                cursor: "pointer",
                                                                fontSize: "0.8rem",
                                                            }}
                                                        >
                                                            <InboxOutlined style={{ fontSize: "1.5rem", color: "#1890ff" }} />
                                                        </Dragger>
                                                    </div>
                                                </div>

                                                {/* Log */}
                                                <div className="row g-3 mb-3 mt-8">
                                                    <div className={`col-12 col-md-2`}>
                                                        <label className="form-label fw-semibold">
                                                            Return Date<span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="form-control form-control-sm"
                                                            value={returnDate}
                                                            onChange={(e) => setReturnDate(e.target.value)}
                                                            disabled={ticketDetails?.Status !== "PICKED UP"}
                                                            title={
                                                                ticketDetails?.Status !== "PICKED UP"
                                                                    ? "Return date can only be set once the asset is picked up."
                                                                    : ""
                                                            }
                                                        />
                                                    </div>
                                                    <div className="col-12 col-md-3">
                                                        <label className="form-label">Return By<span className="text-danger">*</span></label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Enter return engineer name"
                                                            value={returnedBy}
                                                            onChange={(e) => setReturnedBy(e.target.value)}
                                                            disabled={ticketDetails?.Status !== "PICKED UP"}
                                                        />
                                                    </div>
                                                    <div className="col-12 col-md-3">
                                                        <label className="form-label">Organization<span className="text-danger">*</span></label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Enter return engineer organization name"
                                                            value={returnedOrg}
                                                            onChange={(e) => setReturnedOrg(e.target.value)}
                                                            disabled={ticketDetails?.Status !== "PICKED UP"}
                                                        />
                                                    </div>
                                                    <div className="col-12 col-md-3">
                                                        <label className="form-label">Handed Over To<span className="text-danger">*</span></label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Enter associate name"
                                                            value={handedTo}
                                                            onChange={(e) => setHandedTo(e.target.value)}
                                                            disabled={ticketDetails?.Status !== "PICKED UP"}
                                                        />
                                                    </div>
                                                    <div className="mt-3">
                                                        <label className="form-label">Generated Log Preview</label>
                                                        <textarea
                                                            className="form-control form-control-sm"
                                                            rows={3}
                                                            readOnly
                                                            value={
                                                                pickedBy && !returnedBy
                                                                    ? `System Engineer ${pickedBy} picked up asset ${ticketDetails?.MachineName} for off-site repairon ${formatDateToDDMMYYYY(pickupDate)}.`
                                                                    : returnedBy
                                                                        ? `Asset ${ticketDetails?.MachineName} repaired and returned by ${returnedBy} from ${returnedOrg} on ${formatDateToDDMMYYYY(returnDate)}; handed over to associate ${handedTo}.`
                                                                        : ""
                                                            }
                                                            placeholder="Preview here..."
                                                        />
                                                    </div>
                                                </div>
                                                {/* Submit Button */}
                                                <div className="text-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary btn-sm px-4"
                                                        disabled={
                                                            !ShowPickupBtn ||
                                                            !["APPROVED", "PICKED UP"].includes(ticketDetails?.Status)
                                                        } // 🔒 Disable based on both conditions
                                                        onClick={() => {
                                                            if (!ShowPickupBtn) return;

                                                            if (ticketDetails?.Status === "APPROVED") {
                                                                handlePickup();
                                                            } else if (ticketDetails?.Status === "PICKED UP") {
                                                                handleReturned();
                                                            } else {
                                                                Swal.fire({
                                                                    title: "Invalid action",
                                                                    text: "This action cannot be performed for the current ticket status.",
                                                                    icon: "info",
                                                                    confirmButtonText: "OK",
                                                                });
                                                            }
                                                        }}
                                                    >
                                                        {ticketDetails?.Status === "APPROVED"
                                                            ? "Pickup Asset"
                                                            : ticketDetails?.Status === "PICKED UP"
                                                                ? "Return Asset"
                                                                : "Submit"}
                                                    </button>
                                                </div>

                                                <hr className="text-primary" />
                                            </div>
                                        }

                                        {/* Requirements */}
                                        <div className="card shadow-sm border-0 p-4 rounded-4 bg-white">
                                            {/* Section Header */}
                                            <div className="d-flex justify-content-between align-items-center mb-4">
                                                <h5 className="fw-bolder mb-0 d-flex align-items-center gap-2 text-dark">
                                                    <span className="bg-light-primary p-2 rounded-3">
                                                        <i className="fa-solid fa-clipboard-list text-primary"></i>
                                                    </span>
                                                    Requirement Checklist

                                                    {/* Info Tooltip */}
                                                    <Tooltip
                                                        placement="top"
                                                        title={
                                                            <div className="p-1 fs-8">
                                                                <strong>For Purchase Team:</strong> Enter details for any additional items that need to be procured for this issue.
                                                            </div>
                                                        }
                                                    >
                                                        <i className="fa-solid fa-circle-info text-gray-400 fs-7 cursor-help ms-1"></i>
                                                    </Tooltip>
                                                </h5>

                                                <span className="badge bg-light-secondary text-secondary rounded-pill px-3 fw-bold">
                                                    {ticketRequirements?.length || 0} Items
                                                </span>
                                            </div>

                                            {ticketRequirements?.length > 0 ? (
                                                <div className="row gy-4">
                                                    {ticketRequirements.map((item, index) => {
                                                        const isApproved = !!item.Col4;
                                                        const isLocked = ["CLOSED", "NEW"].includes(ticketDetails?.Status);

                                                        return (
                                                            <div className="col-12 col-lg-6 col-xl-4" key={index}>
                                                                <div className={`card h-100 border-start border-4 ${isApproved ? 'border-success' : 'border-warning'} shadow-sm hover-elevate-up`}>
                                                                    <div className="card-body p-4">
                                                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                                                            <div>
                                                                                {isApproved ? (
                                                                                    <span className="badge badge-light-success fw-bold">
                                                                                        <i className="fa-solid fa-circle-check me-1"></i> Approved
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="badge badge-light-warning fw-bold">
                                                                                        <i className="fa-solid fa-clock me-1"></i> Pending
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="d-flex gap-2">
                                                                                {!isApproved && !isLocked && showReqApproveBtn && (
                                                                                    <button
                                                                                        className="btn btn-icon btn-light-success btn-sm rounded-circle"
                                                                                        onClick={() => handleApproved(item)}
                                                                                        title="Approve"
                                                                                        disabled={approvedLoading || reqSubmitLoading}
                                                                                    >
                                                                                        <i className="fa-solid fa-check"></i>
                                                                                    </button>
                                                                                )}
                                                                                {!isLocked && showDeleteBtn && (
                                                                                    <button
                                                                                        className="btn btn-icon btn-light-danger btn-sm rounded-circle"
                                                                                        onClick={() => handleDeleteRequirement(item)}
                                                                                        title="Delete"
                                                                                        disabled={approvedLoading || reqSubmitLoading}
                                                                                    >
                                                                                        <i className="fa-solid fa-trash-can"></i>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="mb-1">
                                                                            <label className="text-uppercase fs-9 fw-bolder text-muted ls-1">Part Number</label>
                                                                            <p className="fw-bold text-gray-800 mb-2">{item.Col1}</p>
                                                                        </div>
                                                                        <div className="mb-3">
                                                                            <label className="text-uppercase fs-9 fw-bolder text-muted ls-1">Description</label>
                                                                            <p className="text-gray-600 small mb-0 line-clamp-2">{item.Col2}</p>
                                                                        </div>

                                                                        <div className="separator separator-dashed my-3"></div>

                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                            <span className="text-muted small">Quantity:</span>
                                                                            <span className="badge bg-gray-100 text-gray-800 fw-bolder fs-7">{item.Col3}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-10 bg-light-light rounded-4 border border-dashed">
                                                    <i className="fa-solid fa-folder-open fs-2tx text-gray-300 mb-3"></i>
                                                    <p className="text-gray-500 fw-semibold">No requirements have been added yet.</p>
                                                </div>
                                            )}

                                            <div className="mt-8 p-5 bg-light rounded-4 border">
                                                <h6 className="fw-bolder mb-4 d-flex align-items-center">
                                                    <i className="fa-solid fa-plus-circle text-primary me-2"></i>
                                                    Add New Requirement
                                                </h6>
                                                <div className="row g-3">
                                                    <div className="col-md-4">
                                                        <label className="form-label fw-bold small text-gray-700">CWI Part Number</label>
                                                        <input
                                                            className="form-control form-control-solid border-gray-300"
                                                            type="text"
                                                            placeholder="e.g. PN-2024"
                                                            value={heading}
                                                            onChange={(e) => setHeading(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-md-5">
                                                        <label className="form-label fw-bold small text-gray-700">Description</label>
                                                        <input
                                                            className="form-control form-control-solid border-gray-300"
                                                            type="text"
                                                            placeholder="Enter item details..."
                                                            value={description}
                                                            onChange={(e) => handleFormattedInput(e.target.value, setDescription)}
                                                        />
                                                    </div>
                                                    <div className="col-md-1">
                                                        <label className="form-label fw-bold small text-gray-700">Qty</label>
                                                        <input
                                                            className="form-control form-control-solid border-gray-300 text-center"
                                                            type="number"
                                                            min="1"
                                                            value={quantity}
                                                            onChange={(e) => setQuantity(e.target.value)}
                                                        />
                                                    </div>
                                                    <div className="col-md-2 d-flex align-items-end">
                                                        <button
                                                            className="btn btn-primary w-100 fw-bolder shadow-sm"
                                                            onClick={handleAddRequirement}
                                                            disabled={["CLOSED", "NEW"].includes(ticketDetails?.Status) || reqSubmitLoading}
                                                        >
                                                            {reqSubmitLoading ? (
                                                                <span className="spinner-border spinner-border-sm"></span>
                                                            ) : (
                                                                <><i className="bi bi-check2-all fs-5"></i>Submit</>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <hr className="text-primary" />

                                        {/* Uploaded Files */}
                                        <div className="card shadow-sm border-0 p-3 rounded-3">
                                            <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 text-primary">
                                                <i className="fa-solid fa-file-arrow-up"></i> Uploaded Files

                                                <Tooltip
                                                    title="If you need to upload any documents like invoices, receipts, or technical files, you can use this feature to attach them to the record."
                                                    placement="right"
                                                >
                                                    <i
                                                        className="fa-solid fa-circle-info text-gray-400"
                                                        style={{ cursor: 'help', fontSize: '14px', marginLeft: '4px' }}
                                                    ></i>
                                                </Tooltip>
                                            </h5>

                                            <div className="d-flex flex-wrap align-items-start gap-3">
                                                {/* Uploaded Files Preview */}
                                                {ticketUploadFiles?.map((item, index) => {
                                                    const fileUrl = `${BASE_IMAGE_API_GET}${item.Col1}`;
                                                    const fileName = fileUrl.split("/").pop();
                                                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl);
                                                    const isPdf = /\.pdf$/i.test(fileUrl);
                                                    const isExcel = /\.(xls|xlsx)$/i.test(fileUrl);
                                                    const isDoc = /\.(doc|docx)$/i.test(fileUrl);
                                                    const icon = isPdf
                                                        ? "bi bi-filetype-pdf text-danger"
                                                        : isExcel
                                                            ? "bi bi-file-earmark-excel-fill text-success"
                                                            : isDoc
                                                                ? "bi bi-file-earmark-word-fill text-primary"
                                                                : "bi bi-file-earmark-fill text-secondary";

                                                    return (
                                                        <div
                                                            key={index}
                                                            className="position-relative border rounded bg-white shadow-sm overflow-hidden"
                                                            style={{
                                                                width: 120,
                                                                height: 120,
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                            }}
                                                        >
                                                            {/* Top-right actions */}
                                                            <div className="position-absolute top-0 end-0 m-1 d-flex gap-2">
                                                                <a
                                                                    href={fileUrl}
                                                                    download={fileName}
                                                                    target="_blank"
                                                                    className="text-decoration-none text-dark"
                                                                    title="Download"
                                                                >
                                                                    <i className="bi bi-download bg-light rounded-circle p-1"></i>
                                                                </a>

                                                                <i
                                                                    className="fa fa-trash text-danger bg-light rounded-circle p-1"
                                                                    title="Delete"
                                                                    style={{
                                                                        cursor:
                                                                            ticketDetails?.Status === "CLOSED" || !showDeleteBtn
                                                                                ? "not-allowed"
                                                                                : "pointer",
                                                                        opacity:
                                                                            ticketDetails?.Status === "CLOSED" || !showDeleteBtn ? 0.5 : 1,
                                                                        pointerEvents:
                                                                            ticketDetails?.Status === "CLOSED" || !showDeleteBtn
                                                                                ? "none"
                                                                                : "auto",
                                                                    }}
                                                                    onClick={() => handleDeleteFile(item)}
                                                                />
                                                            </div>

                                                            {/* File Preview */}
                                                            {isImage ? (
                                                                <img
                                                                    src={fileUrl}
                                                                    alt={`file-${index}`}
                                                                    className="img-fluid rounded"
                                                                    style={{
                                                                        height: "100%",
                                                                        width: "100%",
                                                                        objectFit: "cover",
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="d-flex flex-column justify-content-center align-items-center text-center p-2">
                                                                    <i className={`${icon} fs-2 mb-1`}></i>
                                                                    <small className="text-muted">{fileName}</small>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Upload Box (always last) */}
                                                {ticketUploadFiles.length < maxFiles && (
                                                    <Dragger
                                                        {...draggerProps}
                                                        disabled={ticketDetails?.Status === "CLOSED"}
                                                        showUploadList={false}
                                                        style={{
                                                            width: 120,
                                                            height: 200,
                                                            border: "1px dashed #d9d9d9",
                                                            borderRadius: 8,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            cursor: "pointer",
                                                            background: "#fafafa",
                                                        }}
                                                    >
                                                        <InboxOutlined style={{ fontSize: "2rem", color: "#1890ff" }} />
                                                        <p>Uplaod Files/Images</p>
                                                    </Dragger>
                                                )}
                                            </div>
                                        </div>

                                        <hr className="text-primary" />

                                        {/* Resolved Ticket Section */}
                                        <div className="mt-5 card shadow-sm border-0 p-3 rounded-3">
                                            <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 text-primary mb-3">
                                                <i className="fa-solid fa-screwdriver-wrench"></i>
                                                Resolve Ticket

                                                <Tooltip
                                                    placement="right"
                                                    title={
                                                        <div className="p-1 fs-8">
                                                            <div className="mb-1 border-bottom border-white border-opacity-25 pb-1">
                                                                <strong className="text-white">Resolution Protocol</strong>
                                                            </div>
                                                            <p>The resolution date and description can only be updated by the original requestor to finalize the ticket.</p>
                                                        </div>
                                                    }
                                                >
                                                    <i className="fa-solid fa-circle-info text-gray-400 fs-7 ms-1" style={{ cursor: 'help', fontSize: '14px', marginLeft: '4px' }}></i>
                                                </Tooltip>
                                            </h5>
                                            <div className="mb-4">
                                                <label className="form-label">Resolved Date<span className="text-danger fw-bold">*</span></label>
                                                <input
                                                    type="date"
                                                    className={`form-control form-control-sm w-100 w-md-25 ${ticketDetails?.Status === 'RESOLVED' || ticketDetails?.Status === 'CLOSED' || !showResolveBtn ? 'cursor-not-allowed' : ''}`}
                                                    value={resolvedDate}
                                                    onChange={(e) => setResolvedDate(e.target.value)}
                                                    disabled={ticketDetails?.Status === 'RESOLVED' || ticketDetails?.Status === 'CLOSED'}
                                                    max={new Date().toISOString().split("T")[0]}
                                                />
                                            </div>
                                            <div className="row mb-4 g-4">
                                                <div className="col-12">
                                                    <label className="form-label">Resolution Description<span className="text-danger fw-bold"></span></label>
                                                    <textarea
                                                        className={`form-control ${ticketDetails?.Status === 'RESOLVED' || ticketDetails?.Status === 'CLOSED' || !showResolveBtn ? 'cursor-not-allowed' : ''}`}
                                                        rows={4}
                                                        placeholder="Enter resolved description..."
                                                        value={resolutionDesc}
                                                        onChange={(e) => setResolutionDesc(e.target.value)}
                                                        disabled={ticketDetails?.Status === 'RESOLVED' || ticketDetails?.Status === 'CLOSED'}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <button
                                                    type="button"
                                                    className={`btn btn-primary btn-sm px-5 d-flex ms-auto ${isSubmitDisabled ? "cursor-not-allowed opacity-75" : ""
                                                        }`}
                                                    onClick={handleResolvedTicket}
                                                    disabled={isSubmitDisabled}
                                                >
                                                    <i className="bi bi-check2-all mt-1 me-2"></i>
                                                    {closingLoading ? "Submitting..." : "Submit"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12 col-md-2 order-1 order-md-2 mb-5">
                                        <div
                                            className="card shadow-sm border-0 rounded-3 mb-3"
                                            style={{
                                                height: "100%",
                                                display: "flex",
                                                flexDirection: "column",
                                                justifyContent: "space-between",
                                                overflow: "hidden",
                                            }}
                                        >
                                            <div className="p-2 text-center">
                                                {/* ---- Image Gallery ---- */}
                                                <div className="d-flex flex-wrap justify-content-center gap-2">
                                                    {ticketDetails?.ImageUrl ? (
                                                        ticketDetails.ImageUrl.split(",").map((url, index) => (
                                                            <div
                                                                key={index}
                                                                className="position-relative border rounded shadow-sm"
                                                                style={{
                                                                    width: "100px",
                                                                    height: "100px",
                                                                    overflow: "hidden",
                                                                    backgroundColor: "#f9f9f9",
                                                                }}
                                                            >
                                                                <img
                                                                    src={`${BASE_IMAGE_API_GET}${url.trim()}`}
                                                                    alt={`ticket-img-${index}`}
                                                                    className="img-fluid"
                                                                    style={{
                                                                        width: "100%",
                                                                        height: "100%",
                                                                        objectFit: "cover",
                                                                        cursor: "pointer",
                                                                        transition: "transform 0.2s ease",
                                                                    }}
                                                                    onClick={() => setPreviewImage(`${BASE_IMAGE_API_GET}${url.trim()}`)}
                                                                    data-bs-toggle="modal"
                                                                    data-bs-target="#imagePreviewModal"
                                                                />

                                                                {/* 👁️ View Icon */}
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light-primary border border-primary position-absolute top-0 end-0 m-1 rounded-circle d-flex align-items-center justify-content-center"
                                                                    style={{ width: "24px", height: "24px", lineHeight: "1" }}
                                                                    onClick={() => setPreviewImage(`${BASE_IMAGE_API_GET}${url.trim()}`)}
                                                                    data-bs-toggle="modal"
                                                                    data-bs-target="#imagePreviewModal"
                                                                >
                                                                    <i className="fa fa-eye text-primary ms-1" style={{ fontSize: "0.75rem" }}></i>
                                                                </button>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-muted small">No Images</div>
                                                    )}
                                                </div>

                                                {/* ---- Machine Info ---- */}
                                                <div
                                                    style={{
                                                        fontSize: "0.9rem",
                                                        lineHeight: "1.4",
                                                        textAlign: "left",
                                                        marginTop: "1rem",
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    <div className="d-flex align-items-start mb-4">
                                                        <i className="bi bi-cpu-fill me-2 mt-1 text-primary fs-5"></i>
                                                        <div>
                                                            <div className="text-muted fw-semibold">Asset</div>
                                                            <div className="text-dark fw-semibold">
                                                                {ticketDetails?.MachineName || "N/A"} ({ticketDetails?.MachineCode || "N/A"})
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-start mb-4">
                                                        <i className="bi bi-exclamation-diamond-fill me-2 mt-1 text-danger fs-5"></i>
                                                        <div>
                                                            <div className="text-muted fw-semibold">Issue</div>
                                                            <div className="text-dark fw-semibold">{ticketDetails?.IssueType || "N/A"}</div>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-start">
                                                        <i className="bi bi-chat-left-text-fill me-2 mt-1 text-info fs-5"></i>
                                                        <div>
                                                            <div className="text-muted fw-semibold mb-1">Description</div>
                                                            <div className="text-dark fw-semibold" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                                                {ticketDetails?.Description ? (
                                                                    ticketDetails.Description.split("||").map((desc, index) => (
                                                                        <div key={index} className="mb-1">
                                                                            <span className="text-primary me-2">Issue {index + 1}:</span>
                                                                            {desc.trim()}
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    "N/A"
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* ---- Modal for Image Preview ---- */}
                                        <div
                                            className="modal fade"
                                            id="imagePreviewModal"
                                            tabIndex="-1"
                                            aria-labelledby="imagePreviewLabel"
                                            aria-hidden="true"
                                        >
                                            <div className="modal-dialog modal-dialog-centered modal-lg">
                                                <div className="modal-content border-0">
                                                    <div className="modal-header bg-light">
                                                        <h5 className="modal-title" id="imagePreviewLabel">Image Preview</h5>
                                                        <button
                                                            type="button"
                                                            className="btn-close"
                                                            data-bs-dismiss="modal"
                                                            aria-label="Close"
                                                        ></button>
                                                    </div>
                                                    <div className="modal-body text-center">
                                                        {previewImage ? (
                                                            <img
                                                                src={previewImage}
                                                                alt="Preview"
                                                                className="img-fluid rounded shadow"
                                                                style={{
                                                                    maxHeight: "80vh",
                                                                    objectFit: "contain",
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="text-muted">No image selected</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <style>
                    {`
                    /* Smooth Hover Effect */
                    .transition-row {
                        transition: all 0.2s ease-in-out;
                    }

                    .transition-row:hover {
                        background-color: rgba(var(--kt-primary-rgb), 0.04) !important; /* Very subtle blue tint */
                        transform: scale(1.002); /* Tiny zoom effect */
                        box-shadow: inset 4px 0 0 0 #009ef7; /* Blue left indicator line */
                    }

                    /* Ensure Action doesn't wrap */
                    .text-nowrap {
                        white-space: nowrap !important;
                    }

                    /* Custom Scrollbar for the table container */
                    .custom-table-container::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-table-container::-webkit-scrollbar-thumb {
                        background: #e4e6ef;
                        border-radius: 10px;
                    }
                    .custom-table-container::-webkit-scrollbar-thumb:hover {
                        background: #b5b5c3;
                    }
                    /* Add this to your styles.css */
                    .btn-group .btn {
                        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    /* Hover effect for enabled buttons */
                    .btn-group .btn:not(:disabled):hover {
                        transform: translateY(-2px) scale(1.05);
                        z-index: 2; /* Ensures the scaled button is on top */
                        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
                    }

                    /* Active (click) effect */
                    .btn-group .btn:not(:disabled):active {
                        transform: translateY(0) scale(0.95);
                    }

                    /* Smooth fade for disabled state */
                    .btn-group .btn:disabled {
                        opacity: 0.5;
                        filter: grayscale(0.8);
                        cursor: not-allowed;
                    }

                    .blurred {
                    filter: blur(2px);
                    pointer-events: none;
                    user-select: none;
                    transition: all 0.2s ease-in-out;
                    }

                    /* Overlay container */
                    .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    backdrop-filter: blur(1px);
                    background-color: rgba(255, 255, 255, 0.4);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 999;
                    }

                    /* Optional spinner animation */
                    .spinner-border {
                    width: 3rem;
                    height: 3rem;
                    border-width: 4px;
                    }


                    .step-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: relative;
                    overflow-x: auto;
                    scrollbar-width: thin;
                    scrollbar-color: #bbb transparent;
                    scroll-snap-type: x mandatory;
                    padding-bottom: 10px;
                    }

                    .step-container::-webkit-scrollbar {
                    height: 6px;
                    }

                    .step-container::-webkit-scrollbar-thumb {
                    background: #bbb;
                    border-radius: 10px;
                    }

                    .step-container > div {
                    scroll-snap-align: center;
                    flex: 0 0 auto;
                    min-width: 90px; /* ensures circles + text fit well */
                    }
                    .step-circle-horizontal {
                    width: 38px;
                    height: 38px;
                    border-radius: 50%;
                    border: 2px solid #ccc;
                    background-color: #fff;
                    color: #777;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    position: relative;
                    z-index: 2;
                    transition: all 0.4s ease;
                    }

                    .step-circle-horizontal.filled {
                    background-color: #4b49ac;
                    border-color: #4b49ac;
                    color: #fff;
                    transform: scale(1.1);
                    }

                    /* 🟣 Add a subtle pulsing animation for active step */
                    .step-circle-horizontal.active {
                    animation: pulseActive 1.5s infinite ease-in-out;
                    box-shadow: 0 0 0 0 rgba(75, 73, 172, 0.5);
                    }

                    @keyframes pulseActive {
                    0% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(75, 73, 172, 0.5);
                    }
                    70% {
                        transform: scale(1.15);
                        box-shadow: 0 0 0 12px rgba(75, 73, 172, 0);
                    }
                    100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(75, 73, 172, 0);
                    }
                    }
                    .step-line-horizontal {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translateY(-50%);
                    width: 100%; /* Full stretch to next circle */
                    height: 4px;
                    background-color: #ccc;
                    z-index: 1;
                    border-radius: 2px;
                    transition: all 0.4s ease;
                    }

                    .step-line-horizontal.filled {
                    background: linear-gradient(90deg, #4b49ac, #8c87ff, #4b49ac);
                    background-size: 200% 100%;
                    animation: gradientMove 2s linear infinite;
                    }

                    @keyframes gradientMove {
                    0% {
                        background-position: 200% 0;
                    }
                    100% {
                        background-position: -200% 0;
                    }
                    }


                    @keyframes fillLine {
                        from { width: 0; }
                        to { width: 100%; }
                    }
                    
                    .step-label {
                        font-size: 0.85rem;
                        color: #444;
                        white-space: nowrap;
                    }
                    
                    /* ✅ Mobile adjustments */
                    @media (max-width: 768px) {
                        .step-container {
                        justify-content: flex-start;
                        }
                    
                        .step-container::after {
                        /* subtle gradient hint that more steps exist */
                        content: "";
                        position: absolute;
                        right: 0;
                        top: 0;
                        height: 100%;
                        width: 40px;
                        background: linear-gradient(to left, #fff, transparent);
                        pointer-events: none;
                        }
                    
                        .step-label {
                        font-size: 0.75rem;
                        }
                    }

                    .mentions__suggestions__list {
                        max-height: 160px;
                        overflow-y: auto;
                        border: 1px solid #d9d9d9;
                        border-radius: 6px;
                        background: #fff;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                        scrollbar-width: thin;
                        }

                        .mentions__suggestions__item {
                        padding: 8px 12px;
                        cursor: pointer;
                        }

                        .mentions__suggestions__item--focused {
                        background-color: #e6f7ff;
                        }

                    .mention-highlight {
                        color: var(--bs-danger); /* uses your Bootstrap primary color */
                        font-weight: 600;
                    }
                    .comments-chat {
                        background: #fff;
                        border: 1px solid #e6e6e6;
                        padding: 15px;
                        max-height: 400px;
                        overflow-y: auto;
                    }

                    .formal-comment-item {
                        display: flex;
                        align-items: flex-start;
                    }

                    .avatar-circle {
                        background-color: #007bff;
                        color: #fff;
                        border-radius: 50%;
                        width: 38px;
                        height: 38px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 600;
                        font-size: 16px;
                        flex-shrink: 0;
                        text-transform: uppercase;
                    }

                    .comment-content {
                        background-color: #f8f9fa;
                        padding: 10px 12px;
                        border-radius: 10px;
                        flex: 1;
                    }

                    .comment-header {
                        display: flex;
                        align-items: center;
                        justify-content: flex-start;
                    }

                    .comment-name {
                        font-size: 14px;
                        color: #333;
                    }

                    .comment-time {
                        font-size: 12px;
                        color: #888;
                    }

                    .comment-text {
                        font-size: 14px;
                        color: #444;
                        line-height: 1.4;
                    }
                    .mentions {
                        width: 100%;
                        min-height: 120px;
                        border: 1px solid #ccc;
                        padding: 8px;
                        font-size: 14px;
                        border-radius: 8px;
                    }

                    .disabled-icon {
                        cursor: not-allowed !important;
                        opacity: 0.5;
                        pointer-events: none; /* disables click interaction */
                    }
                    .blink-badge {
                        animation: blinker 1.2s linear infinite;
                    }

                    @keyframes blinker {
                        50% {
                            opacity: 0.4;
                        }
                    }
                    .badge-light-blue {
                        background-color: #cce5ff;
                        color: #004085;
                    }

                    /* Light Pastel Badges */
.badge-light-skyblue {
    background-color: #b3ecff;
    color: #007b8a;
}

.badge-light-purple {
    background-color: #d6c1ff;
    color: #4b0082;
}

.badge-light-indigo {
    background-color: #c5cae9;
    color: #283593;
}

.badge-light-teal {
    background-color: #b2dfdb;
    color: #004d40;
}

.badge-light-pink {
    background-color: #f8bbd0;
    color: #880e4f;
}

.badge-light-brown {
    background-color: #d7ccc8;
    color: #3e2723;
}

.badge-light-gray {
    background-color: #eceff1;
    color: #37474f;
}

.badge-light-gold {
    background-color: #fff8e1;
    color: #8d6e00;
}

                    `}
                </style>

            </div>
            <RegisterTicket />
            <EditTicket editObj={editData} />
            <AssignTechnician ticketObj={ticketData} />
            <CloseTicket ticketObj={closeData} />
        </Base1>
    )
}