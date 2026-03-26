
import React, { useState, useEffect } from "react";
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import '../../Config/Pagination.css';
import '../../Config/Loader.css';
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import { Form, Button, message, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../utils/api";
import { MentionsInput, Mention } from "react-mentions";

export default function TicketScanview() {

    const { orgId, machineId } = useParams();
    const [mcnTickets, setMcnTickets] = useState([]);
    const [sessionUserData, setSessionUserData] = useState([]);
    const [mcnAlerts, setMcnAlerts] = useState([]);
    const [mcnTicketLogs, setMcnTicketLogs] = useState([]);
    const [mcnTicketsLoading, setMcnTicketsLoading] = useState(false);
    const [mcnAlertsLoading, setMcnAlertsLoading] = useState(false);
    const [viewTicketShow, setViewTicketShow] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewData, setViewData] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [machineData, setMachineData] = useState([]);
    const [machinePartsData, setMachinePartsData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [images, setImages] = useState([]);
    const [approvedLoading, setApprovedLoading] = useState(false);
    const [ticketDetails, setTicketDetails] = useState([]);
    const [ticketLogs, setTicketLogs] = useState([]);
    const [ticketRequirements, setTicketRequirements] = useState([]);
    const [description, setDescription] = useState("");
    const [quantity, setQuantity] = useState("");
    const [heading, setHeading] = useState("");
    const [ticketUploadFiles, setTicketUploadFiles] = useState([]);
    const [resolvedDate, setResolvedDate] = useState(ticketDetails?.ResolvedDate || "");
    const [resolutionDesc, setResolutionDesc] = useState(ticketDetails?.ResolutionSummary || "");
    const [closingLoading, setClosingLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [reqSubmitLoading, setReqSubmitLoading] = useState(false);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [ticketComments, setTicketComments] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [enteredContent, setEnteredContent] = useState("");
    const [plainTextContent, setPlainTextContent] = useState("");
    const [commentSubmitLoading, setCommentSubmitLoading] = useState(false);
    const [mentionedEmails, setMentionedEmails] = useState("");
    const [returnedBy, setReturnedBy] = useState("");
    const [returnedOrg, setReturnedOrg] = useState("");
    const [previewImage, setPreviewImage] = useState(null);
    const [pickupDate, setPickupDate] = useState("");
    const [returnDate, setReturnDate] = useState("");
    const [handedTo, setHandedTo] = useState("");
    const [pickedBy, setPickedBy] = useState("");
    const [alertsData, setAlertsData] = useState([]);
    const { Dragger } = Upload;
    const maxFiles = 4;

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

    const fetchUsers = async () => {
        try {
            const response = await fetchWithAuth(`auth/getUsers?OrgId=${sessionUserData.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                const formattedUsers = data.ResultData
                    .map(u => ({
                        id: u.Email,       // 👈 use Email as ID
                        display: u.Name, // what appears in mention
                    })) || [];
                setUsersData(formattedUsers);
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
                TablePrimaryId: viewData?.Id, // replace dynamically if needed
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

    const fetchAllData = async () => {
        setDataLoading(true);
        setMcnAlertsLoading(true);

        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const fromDate = `${yyyy}-${mm}-${dd}`;

        const next20Days = new Date(now);
        next20Days.setDate(next20Days.getDate() + 20);

        const toYyyy = next20Days.getFullYear();
        const toMm = String(next20Days.getMonth() + 1).padStart(2, '0');
        const toDd = String(next20Days.getDate()).padStart(2, '0');
        const toDate = `${toYyyy}-${toMm}-${toDd}`;

        try {
            const [machineRes, partsRes, alertsRes] = await Promise.all([
                fetchWithAuth(`PMMS/GetMachineById?OrgId=${orgId}&MachineId=${machineId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }),
                fetchWithAuth(`PMMS/GetPartsByMachineId?MachineId=${machineId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }),
                fetchWithAuth(`public/AlertsByMachineId?MachineId=${machineId}&FromDate=${fromDate}&ToDate=${toDate}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }),
            ]);

            const [machineJson, partsJson, alertsjson] = await Promise.all([machineRes.json(), partsRes.json(), alertsRes.json()]);

            if (machineRes.ok) setMachineData(machineJson.ResultData[0]);
            if (partsRes.ok) setMachinePartsData(partsJson.ResultData);
            if (alertsRes.ok) setAlertsData(alertsjson.ResultData);
            setDataLoading(false);
            setMcnAlertsLoading(false);

        } catch (err) {
            console.error("Error fetching data:", err);
            setDataLoading(false);
            setMcnAlertsLoading(false);
        } finally {
            setDataLoading(false);
            setMcnAlertsLoading(false);
        }
    };

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log('session not avilable..!');
        }
    }, []);

    useEffect(() => {
        if (orgId && machineId) {
            fetchAllData();
        }
    }, [machineId, orgId]);

    useEffect(() => {
        if (machineData?.ImageUrls) {
            const filenames = machineData.ImageUrls.split(",");
            const fullUrls = filenames.map((name) => `${BASE_IMAGE_API_GET}${name}`);
            setImages(fullUrls);
        }
    }, [machineData]);

    const fetchTicketData = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/TicketOverView?TickId=${viewData?.Id}&Id=${orgId}`, {
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

    const fetchData = async () => {
        setMcnTicketsLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/GetTicketsByMachineId?MachineId=${machineId}&OrgId=${orgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                setMcnTickets(data.ResultData);
            } else {
                setMcnTicketsLoading(false);
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching mcn tickets data:', error.message);
            setMcnTicketsLoading(false);
        } finally {
            setMcnTicketsLoading(false);
        }
    };

    const fetchTicketDetails = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/GetTicketsBYId?TicketId=${viewData?.Id}&OrgId=${orgId}`, {
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
        if (viewData?.Id && orgId) {
            fetchTicketData();
            fetchTicketDetails();
        }
    }, [viewData, orgId]);

    // const content = (
    //     <div className="p-3" style={{ maxWidth: 320, minWidth: 280 }}>
    //         {/* Image */}
    //         <img
    //             src={`${BASE_IMAGE_API_GET}${ticketDetails?.ImageUrl}`}
    //             alt="ticket"
    //             className="img-fluid rounded-3 border mb-3 shadow-sm"
    //             style={{
    //                 maxHeight: "160px",
    //                 objectFit: "cover",
    //                 width: "100%",
    //                 borderColor: "#cce5ff", // light blue border
    //                 boxShadow: "0 4px 12px rgba(0, 123, 255, 0.15)" // soft blue shadow
    //             }}
    //         />

    //         {/* Machine Code */}
    //         <div className="d-flex align-items-start mb-2">
    //             <i className="bi bi-cpu-fill me-2 text-primary fs-5 mt-1"></i>
    //             <div>
    //                 <div className="text-muted fw-bold small">Machine Code</div>
    //                 <div className="text-dark">{ticketDetails?.MachineCode || 'N/A'}</div>
    //             </div>
    //         </div>

    //         {/* Issue Type */}
    //         <div className="d-flex align-items-start mb-2">
    //             <i className="bi bi-exclamation-diamond-fill me-2 text-danger fs-5 mt-1"></i>
    //             <div>
    //                 <div className="text-muted fw-bold small">Issue Type</div>
    //                 <div className="text-dark">{ticketDetails?.IssueType || 'N/A'}</div>
    //             </div>
    //         </div>

    //         {/* Description */}
    //         <div className="d-flex align-items-start">
    //             <i className="bi bi-chat-left-text-fill me-2 text-info fs-5 mt-1"></i>
    //             <div>
    //                 <div className="text-muted fw-bold small">Description</div>
    //                 <div className="text-dark">{ticketDetails?.Description || 'N/A'}</div>
    //             </div>
    //         </div>
    //     </div>
    // );

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
                formData.append("TicketId", viewData?.Id);
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

    const fetchMcnTicktLogs = async () => {
        setMcnTicketsLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/GetTicketLogs?TicketId=${viewData?.Id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setMcnTicketLogs(data.ResultData);
            } else {
                setMcnTicketsLoading(false);
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching mcn tickets data:', error.message);
            setMcnTicketsLoading(false);
        } finally {
            setMcnTicketsLoading(false);
        }
    };

    useEffect(() => {
        if (machineId) {
            fetchData();
        }
    }, [machineId]);

    useEffect(() => {
        if (viewData?.Id) {
            fetchMcnTicktLogs();
        }
    }, [viewData]);

    const filteredData = Array.isArray(mcnTickets)
        ? mcnTickets.filter((item) => {
            const ticketCode = item?.TicketCode?.toLowerCase() || "";
            return ticketCode.includes(searchQuery.toLowerCase());
        })
        : [];

    const handleView = (item) => {
        setViewTicketShow(true);
        setViewData(item);
    };

    const recordsPerPage = 5;
    const totalPages = Math.ceil((filteredData || []).length / recordsPerPage);

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredData?.slice(indexOfFirstRecord, indexOfLastRecord);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const getPaginationNumbers = () => {
        const visiblePages = [];
        if (totalPages <= 6) {
            for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
        } else {
            if (currentPage <= 3) {
                visiblePages.push(1, 2, 3, "...", totalPages - 2, totalPages - 1, totalPages);
            }
            else if (currentPage > 3 && currentPage < totalPages - 2) {
                visiblePages.push(1, 2, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages - 1, totalPages);
            }
            else {
                visiblePages.push(1, 2, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            }
        }
        return visiblePages;
    };

    const handlePageClick = (page) => {
        if (page !== "...") setCurrentPage(page);
    };

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
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
                TicketStatus: "REQ APPROVED",
                TicketId: viewData?.Id,
                UserId: sessionUserData?.Id,
                JsonData: {
                    TicketCreated: ticketDetails?.TicketCreated,
                    TicketCode: ticketDetails?.TicketCode,
                    MachineId: ticketDetails?.MachineId,
                    ReqId: item.Label
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

    const handlePickup = async (item) => {
        setLoading(true);

        if (!pickedBy || !pickupDate) {
            setLoading(false);
            Swal.fire({
                title: "Invalid action",
                text: "Please enter all required fileds.",
                icon: "info",
                confirmButtonText: "OK"
            });
            return;
        };

        try {
            const formPayload = {
                OrgId: sessionUserData?.OrgId,
                Priority: ticketDetails?.Priority,
                TicketStatus: "PICKED UP",
                TicketId: viewData?.Id,
                UserId: sessionUserData?.Id,
                JsonData: {
                    Logs: `System Engineer ${pickedBy} picked up machine ${ticketDetails?.MachineName} for off-site repairon ${pickupDate}.`,
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
                if (result.data.result[0].ResponseCode === 2007) {
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
                TicketId: viewData?.Id,
                UserId: sessionUserData?.Id,
                JsonData: {
                    Logs: `Machine ${ticketDetails?.MachineName} repaired and returned by ${returnedBy} on ${returnDate}; handed over to associate ${handedTo}.`,
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
                if (result.data.result[0].ResponseCode === 2007) {
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
                "OrgId": orgId,
                "Priority": 1,
                "TicketStatus": "REQ APPROVAL",
                "TicketId": viewData?.Id,
                "UserId": sessionUserData?.Id,
                "JsonData": {
                    "TicketCode": ticketDetails?.TicketCode,
                    "MachineId": ticketDetails?.MachineId,
                    "Requirements": [
                        {
                            "RequirementName": heading,
                            "Description": description,
                            "Quantity": quantity
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
                        setReqSubmitLoading(false);
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

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "new":
                return "badge-light-primary";
            case "assigned":
                return "badge-light-warning";
            case "approved":
                return "badge-light-danger";
            case "closed":
                return "badge-light-success";
            case "resolved":
                return "badge-light-info";
            case "req approval":
                return "badge-light-warning";
            case "req approved":
                return "badge-light-info";
            case "filesupload":
                return "badge-light-info";
            default:
                return "badge-light";
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
                    TicketId: viewData?.Id,
                    UserId: sessionUserData?.Id,
                    RequirementName: item.Col1,
                };

                const response = await fetchWithAuth(`PMMS/InactiveTicketRequirements`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formPayload),
                });

                const result = await response.json();

                if (result.ResultData[0].Status === "true") {
                    Swal.fire({
                        title: "Success",
                        text: "Requirement deleted successfully.",
                        icon: "success",
                    }).then(() => {
                        fetchTicketData();
                    });
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

                if (result.ResultData[0].Status === 'true') {
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
            TicketId: viewData?.Id,
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

    const [expandedRows, setExpandedRows] = useState({});

    const toggleReadMore = (index) => {
        setExpandedRows((prev) => ({
            ...prev,
            [index]: !prev[index],
        }));
    };

    const truncateText = (text, limit = 100) => {
        if (!text) return "N/A";
        return text.length > limit ? text.substring(0, limit) + "..." : text;
    };

    const calculateAging = (item) => {
        if (!item.CreatedOn) return "N/A";

        const created = new Date(item.CreatedOn);
        const updated = item.UpdatedOn ? new Date(item.UpdatedOn) : new Date();

        let diffInDays = Math.floor((updated - created) / (1000 * 60 * 60 * 24));

        return diffInDays === 0 ? "Today" : `${diffInDays} day${diffInDays > 1 ? "s" : ""}`;
    };


    const steps = ["NEW", "MODIFIED", "APPROVED", "ASSIGNED", "PICKUP", "RETURNED", "RESOLVED", "CLOSED"];
    const activeStepIndex = steps.indexOf(ticketDetails?.Status);

    const showReqApproveBtn = sessionActionIds?.includes(12);
    const showResolveBtn = sessionActionIds?.includes(13);
    const showDeleteBtn = sessionActionIds?.includes(11);
    const ShowPickupBtn = sessionActionIds?.includes(20);

    return (
        <>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <nav>
                        <div className="nav nav-tabs custom-nav-tabs" id="nav-tab" role="tablist">
                            <button
                                className="nav-link active"
                                id="nav-info-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#nav-info"
                                type="button"
                                role="tab"
                                aria-controls="nav-info"
                                aria-selected="true"
                            >
                                <i className="fa-solid fa-circle-info"></i> Info
                            </button>
                            <button
                                className="nav-link"
                                id="nav-tickets-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#nav-tickets"
                                type="button"
                                role="tab"
                                aria-controls="nav-tickets"
                                aria-selected="false"
                            >
                                <i className="fa-solid fa-ticket"></i> Tickets
                            </button>
                            <button
                                className="nav-link"
                                id="nav-alerts-tab"
                                data-bs-toggle="tab"
                                data-bs-target="#nav-alerts"
                                type="button"
                                role="tab"
                                aria-controls="nav-alerts"
                                aria-selected="false"
                            >
                                <i className="fa-solid fa-bullhorn"></i> Alerts
                            </button>
                        </div>
                    </nav>
                    {viewTicketShow &&
                        <button
                            className="btn btn-secondary btn-sm d-flex ms-auto my-3 me-3"
                            onClick={() => setViewTicketShow(false)}
                            type="button"
                        >
                            <i className="fa-solid fa-arrow-left mt-1"></i>Tickets
                        </button>
                    }
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        <Link
                            to="/pmms/pmms-dashboard"
                            className={`btn btn-dark btn-sm`}>
                            <i className="fa-solid fa-arrow-left me-"></i>Scan
                        </Link>
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className={`app-content flex-column-fluid ${dataLoading ? 'blurred' : ''}`}>
                {dataLoading && (
                    <div className="loading-overlay">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                )}
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card">
                        <div className="tab-content" id="nav-tabContent">
                            <div className="tab-pane fade show active"
                                id="nav-info"
                                role="tabpanel"
                                aria-labelledby="nav-info-tab"
                            >
                                <div className="card mt-4">
                                    <div className="card-body px-2 px-sm-3">
                                        <h5 className="text-dark fw-bold mb-3">Machine Details</h5>

                                        {images?.length > 0 && (
                                            <div
                                                id="machineImageCarousel"
                                                className="carousel slide mb-4"
                                                data-bs-ride="carousel"
                                                data-bs-interval="2500" // auto scroll every 2.5 sec
                                            >
                                                <div className="carousel-inner rounded border">
                                                    {images.map((img, i) => {
                                                        const src = img instanceof File ? URL.createObjectURL(img) : img;
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`carousel-item ${i === 0 ? "active" : ""}`}
                                                            >
                                                                <img
                                                                    src={src}
                                                                    className="d-block w-100"
                                                                    alt={`Machine Image ${i + 1}`}
                                                                    style={{
                                                                        height: "250px",
                                                                        objectFit: "cover",
                                                                        borderRadius: "8px",
                                                                    }}
                                                                />
                                                                <div className="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded-2 px-2 py-1">
                                                                    <p className="small text-white mb-0">Image {i + 1}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Controls */}
                                                {images.length > 1 && (
                                                    <>
                                                        <button
                                                            className="carousel-control-prev"
                                                            type="button"
                                                            data-bs-target="#machineImageCarousel"
                                                            data-bs-slide="prev"
                                                        >
                                                            <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                                                        </button>
                                                        <button
                                                            className="carousel-control-next"
                                                            type="button"
                                                            data-bs-target="#machineImageCarousel"
                                                            data-bs-slide="next"
                                                        >
                                                            <span className="carousel-control-next-icon" aria-hidden="true"></span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}


                                        <div
                                            className="list-group shadow-sm rounded-3 mb-4"
                                            id="machineDetailsAttachment"
                                        >
                                            {[
                                                {
                                                    icon: "bi bi-gear",
                                                    label: "Machine Name",
                                                    value: machineData?.MachineName || "-",
                                                },
                                                {
                                                    icon: "bi bi-upc-scan",
                                                    label: "Machine Code",
                                                    value: machineData?.MachineCode || "-",
                                                },
                                                {
                                                    icon: "bi bi-cpu",
                                                    label: "Model",
                                                    value: machineData?.Model || "-",
                                                },
                                                {
                                                    icon: "bi bi-building-gear",
                                                    label: "Make",
                                                    value: machineData?.MachineMake || "-",
                                                },
                                                {
                                                    icon: "bi bi-diagram-3",
                                                    label: "Department",
                                                    value: machineData?.DeptName || "-",
                                                },
                                                {
                                                    icon: "bi bi-layers",
                                                    label: "Section",
                                                    value: machineData?.SectionName || "-",
                                                },
                                                {
                                                    icon: "bi bi-truck",
                                                    label: "Supplier",
                                                    value: machineData?.SupplierName || "-",
                                                },
                                                {
                                                    icon: "bi bi-calendar-check",
                                                    label: "Purchase Date",
                                                    value: formatDate(machineData?.PurchaseDate),
                                                },
                                                {
                                                    icon: "bi bi-calendar-plus",
                                                    label: "Installation Date",
                                                    value: formatDate(machineData?.InstallationDate),
                                                },
                                                {
                                                    icon: "bi bi-bell",
                                                    label: "Next Due",
                                                    value: formatDate(machineData?.UpcomingMaintenanceDate),
                                                },
                                                {
                                                    icon: "bi bi-info-circle",
                                                    label: "Status",
                                                    value: (
                                                        <span
                                                            style={{
                                                                backgroundColor:
                                                                    machineData?.Status === "Running" ? "#198754" : "#0dcaf0",
                                                                color: "#fff",
                                                                padding: "2px 8px",
                                                                borderRadius: "4px",
                                                                fontSize: "0.85rem",
                                                                whiteSpace: "nowrap",
                                                            }}
                                                        >
                                                            {machineData?.Status || "-"}
                                                        </span>
                                                    ),
                                                },
                                            ].map((detail, i) => (
                                                <div
                                                    key={i}
                                                    className="list-group-item"
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        padding: "10px 12px",
                                                        borderBottom: "1px solid #eee",
                                                        wordBreak: "break-word",
                                                    }}
                                                >
                                                    <i
                                                        className={`${detail.icon}`}
                                                        style={{
                                                            fontSize: "1.1rem",
                                                            color: "#4b49ac",
                                                            marginRight: "10px",
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    <span
                                                        style={{
                                                            fontWeight: 600,
                                                            color: "#444",
                                                            marginRight: "6px",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {detail.label}:
                                                    </span>
                                                    <span
                                                        style={{
                                                            flex: 1,
                                                            color: "#222",
                                                            fontWeight: 500,
                                                            overflowWrap: "break-word",
                                                            whiteSpace: "normal",
                                                        }}
                                                    >
                                                        {detail.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>


                                        <h6 className="text-dark fw-bold mt-4 mb-3">Key Internal Components</h6>
                                        <div className="row g-3 mb-4">
                                            {machinePartsData?.length > 0 ? (
                                                machinePartsData.map((part, i) => (
                                                    <div className="col-12 px-2" key={i}>
                                                        <div
                                                            className="shadow-sm border rounded d-flex flex-row align-items-center p-2"
                                                            style={{
                                                                background: "#fff",
                                                                transition: "all 0.2s ease",
                                                            }}
                                                        >
                                                            {/* 🖼️ Image with modal trigger */}
                                                            <img
                                                                src={`${BASE_IMAGE_API_GET}${part.ImageUrl}`}
                                                                alt={part.PartName}
                                                                data-bs-toggle="modal"
                                                                data-bs-target="#imageModal"
                                                                data-img={`${BASE_IMAGE_API_GET}${part.ImageUrl}`}
                                                                style={{
                                                                    width: "100px",
                                                                    height: "100px",
                                                                    objectFit: "cover",
                                                                    borderRadius: "8px",
                                                                    border: "1px solid #ddd",
                                                                    marginRight: "12px",
                                                                    cursor: "pointer",
                                                                    flexShrink: 0,
                                                                }}
                                                                onClick={(e) => {
                                                                    const modalImg = document.getElementById("modalImage");
                                                                    if (modalImg) modalImg.src = e.target.dataset.img;
                                                                }}
                                                            />

                                                            {/* 🧾 Details Section */}
                                                            <div style={{ flex: 1, overflow: "hidden" }}>
                                                                <div
                                                                    className="fw-bold link-primary mb-1 text-truncate"
                                                                    title={part.PartName}
                                                                    style={{ color: "#0d6efd", fontSize: "1rem" }}
                                                                >
                                                                    {part.PartName}
                                                                </div>

                                                                <div
                                                                    className="small text-muted mb-1"
                                                                    style={{ fontSize: "0.875rem" }}
                                                                >
                                                                    <i className="bi bi-hash"></i>{" "}
                                                                    <span className="fw-semibold">Model:</span>{" "}
                                                                    {part.PartModel || "-"}
                                                                </div>

                                                                <div
                                                                    className="small text-muted mb-1"
                                                                    style={{ fontSize: "0.875rem" }}
                                                                >
                                                                    <i className="bi bi-upc-scan"></i>{" "}
                                                                    <span className="fw-semibold">Code:</span>{" "}
                                                                    {part.PartCode || "-"}
                                                                </div>

                                                                <div
                                                                    className="small text-muted mb-1"
                                                                    style={{ fontSize: "0.875rem" }}
                                                                >
                                                                    <i className="bi bi-calendar-check"></i>{" "}
                                                                    <span className="fw-semibold">Installation Date:</span>{" "}
                                                                    {formatDate(part.InstallationDate)}
                                                                </div>

                                                                <div
                                                                    className="small text-muted mb-1"
                                                                    style={{ fontSize: "0.875rem" }}
                                                                >
                                                                    <i className="bi bi-sliders"></i>{" "}
                                                                    <span className="fw-semibold">Status:</span>{" "}
                                                                    <span
                                                                        className={`badge ${part.Status === "Active"
                                                                                ? "bg-success"
                                                                                : part.Status === "Closed"
                                                                                    ? "bg-danger"
                                                                                    : "bg-warning text-dark"
                                                                            }`}
                                                                        style={{
                                                                            fontSize: "0.8rem",
                                                                            verticalAlign: "middle",
                                                                        }}
                                                                    >
                                                                        {part.Status || "N/A"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center text-muted py-4">
                                                    No internal components found.
                                                </div>
                                            )}
                                        </div>

                                        {/* 🖼️ Bootstrap Modal (works with your theme JS) */}
                                        <div
                                            className="modal fade"
                                            id="imageModal"
                                            tabIndex="-1"
                                            aria-labelledby="imageModalLabel"
                                            aria-hidden="true"
                                        >
                                            <div
                                                className="modal-dialog modal-dialog-centered"
                                                style={{ maxWidth: "600px" }}
                                            >
                                                <div className="modal-content border-0 shadow">
                                                    <div className="modal-body p-0 text-center">
                                                        <img
                                                            id="modalImage"
                                                            src=""
                                                            alt="Zoomed"
                                                            className="img-fluid w-100"
                                                            style={{
                                                                borderRadius: "8px",
                                                                maxHeight: "80vh",
                                                                objectFit: "contain",
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="modal-footer border-0 justify-content-center">
                                                        <button
                                                            type="button"
                                                            className="btn btn-secondary btn-sm px-3"
                                                            data-bs-dismiss="modal"
                                                        >
                                                            Close
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="tab-pane fade"
                                id="nav-tickets"
                                role="tabpanel"
                                aria-labelledby="nav-tickets-tab"
                            >
                                <div className={`card-header border-0 pt-2 ${viewTicketShow ? 'd-none' : 'd-block'}`}>
                                    <div className="card-title d-flex justify-content-between align-items-center w-100">
                                        <div>
                                            <h6>Tickets List</h6>
                                        </div>

                                        <div className="text-center flex-grow-1">
                                            <h1
                                                className="mb-0"
                                                style={{
                                                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                                                    fontWeight: 600,
                                                    color: "#4B49AC",
                                                    letterSpacing: "1px",
                                                    textTransform: "uppercase",
                                                }}
                                            >
                                                {mcnTickets && mcnTickets[0]?.MachineName}
                                            </h1>
                                        </div>

                                        {viewTicketShow && (
                                            <div className="ms-auto">
                                                <span
                                                    className={`badge ${getStatusBadgeClass(viewData?.Status)} blink-badge border border-dark`}
                                                    style={{
                                                        fontSize: "0.95rem",
                                                        padding: "8px 14px",
                                                        borderRadius: "20px",
                                                        fontWeight: 700,
                                                        letterSpacing: "0.5px",
                                                    }}
                                                >
                                                    {viewData?.Status}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="card-body pt-0">
                                    <hr className={`text-warning ${viewTicketShow ? 'd-none' : 'd-block'}`} />

                                    <div className={`table-responsive ${viewTicketShow ? 'd-none' : 'd-block'}`}>
                                        <table className="table table-bordered fs-6 gy-5 d-none d-md-table w-100">
                                            <thead>
                                                <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                                    <th>S.No</th>
                                                    <th >Ticket Code</th>
                                                    <th >Technician</th>
                                                    <th>Priority</th>
                                                    <th >Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="fw-semibold text-gray-600">
                                                {mcnTicketsLoading ? (
                                                    <tr>
                                                        <td colSpan="8" className="text-center">
                                                            <div className="container"></div>
                                                        </td>
                                                    </tr>
                                                ) : currentRecords && currentRecords.length > 0 ? (
                                                    currentRecords.map((item, index) => (
                                                        <tr>
                                                            <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                            <td>
                                                                <a onClick={() => handleView(item)} className="text-hover-primary mb-1 cursor-pointer text-info">{item.TicketCode}</a>
                                                            </td>
                                                            <td>{item.TechnicianName || 'N/A'}</td>
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
                                                                <span className={`badge ${getStatusBadgeClass(item.Status)}`}>{item.Status}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="8" className="text-center">
                                                            <p>No Data Available</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className={`list-group d-block d-md-none ${viewTicketShow ? 'd-none' : 'd-block'}`}>
                                        {mcnTicketsLoading ? (
                                            <div className="text-center py-4">
                                                <div className="spinner-border text-primary" role="status"></div>
                                            </div>
                                        ) : currentRecords && currentRecords.length > 0 ? (
                                            currentRecords.map((item, index) => {
                                                const aging = calculateAging(item);
                                                const imgSrc = `${BASE_IMAGE_API_GET}${item.ImageUrl}` || ""; // fallback

                                                return (
                                                    <div
                                                        key={index}
                                                        className="list-group-item py-3 border-bottom d-flex flex-column my-2"
                                                        onClick={() => handleView(item)}
                                                    >
                                                        {/* Top Row */}
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <small className="text-primary fw-bold">{item.TicketCode}</small>
                                                            <small className={`badge ${getStatusBadgeClass(item.Status)}`}>{item.Status}</small>
                                                        </div>

                                                        {/* Content Row */}
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            {/* Left side details */}
                                                            <div className="flex-grow-1 pe-2">
                                                                <div className="fw-semibold text-dark mb-1">
                                                                    <span className="me-2 text-muted">Created By:</span> {item.UserName || "N/A"}
                                                                </div>
                                                                <div className="fw-semibold text-dark mb-1">
                                                                    <span className="me-2 text-muted">Created On:</span>{" "}
                                                                    {new Date(item.CreatedOn).toLocaleDateString()}
                                                                </div>
                                                                <div className="fw-semibold text-dark mb-1">
                                                                    <span className="me-2 text-muted">Aging:</span> {aging}
                                                                </div>
                                                                <div className="fw-semibold text-dark mb-1">
                                                                    <span className="me-2 text-muted">Priority:</span>
                                                                    {item.Priority === 1 && <strong className="text-danger">High</strong>}
                                                                    {item.Priority === 2 && <strong className="text-warning">Medium</strong>}
                                                                    {item.Priority === 3 && <strong className="text-primary">Low</strong>}
                                                                </div>
                                                            </div>

                                                            {/* Right side image */}
                                                            <div style={{ width: "80px", height: "80px", flexShrink: 0 }}>
                                                                <img
                                                                    src={imgSrc}
                                                                    alt="Ticket"
                                                                    className="rounded object-fit-cover border"
                                                                    style={{ width: "100%", height: "100%", borderRadius: "8px", objectFit: "cover" }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center text-muted py-3">No Data Available</div>
                                        )}
                                    </div>


                                    <div className={`dt-paging paging_simple_numbers ${viewTicketShow ? 'd-none' : 'd-block'}`}>
                                        <nav aria-label="pagination">
                                            <ul className="pagination">
                                                <li
                                                    className={`dt-paging-button page-item ${currentPage === 1 ? "disabled" : ""}`}
                                                >
                                                    <button
                                                        className="page-link previous"
                                                        role="link"
                                                        type="button"
                                                        aria-controls="kt_customers_table"
                                                        aria-disabled={currentPage === 1}
                                                        aria-label="Previous"
                                                        onClick={handlePrevious}
                                                    >
                                                        <i className="previous"></i>
                                                    </button>
                                                </li>
                                                {getPaginationNumbers().map((page, index) => (
                                                    <li
                                                        key={index}
                                                        className={`dt-paging-button page-item ${page === currentPage ? "active" : ""}`}
                                                    >
                                                        <button
                                                            className="page-link"
                                                            role="link"
                                                            type="button"
                                                            aria-controls="kt_customers_table"
                                                            aria-current={page === currentPage ? "page" : undefined}
                                                            onClick={() => handlePageClick(page)}
                                                            disabled={page === "..."}
                                                        >
                                                            {page}
                                                        </button>
                                                    </li>
                                                ))}
                                                <li
                                                    className={`dt-paging-button page-item ${currentPage === totalPages ? "disabled" : ""}`}
                                                >
                                                    <button
                                                        className="page-link next"
                                                        role="link"
                                                        type="button"
                                                        aria-controls="kt_customers_table"
                                                        aria-disabled={currentPage === totalPages}
                                                        aria-label="Next"
                                                        onClick={handleNext}
                                                    >
                                                        <i className="next"></i>
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </div>

                                    {viewTicketShow &&
                                        <>
                                            <div className="step-container d-flex justify-content-between align-items-center w-100 my-4 pt-2">
                                                {steps.map((step, index) => {
                                                    const isFilled = index <= activeStepIndex;
                                                    const isActive = index === activeStepIndex;

                                                    return (
                                                        <div key={step} className="text-center flex-fill position-relative">
                                                            {/* Circle */}
                                                            <div
                                                                className={`step-circle-horizontal mx-auto 
                                                                ${isFilled ? "filled" : ""} 
                                                                ${isActive ? "active" : ""}`}
                                                            >
                                                                {index + 1}
                                                            </div>

                                                            {/* Line connecting to next step */}
                                                            {index !== steps.length - 1 && (
                                                                <div
                                                                    className={`step-line-horizontal ${index < activeStepIndex ? "filled" : ""}`}
                                                                ></div>
                                                            )}

                                                            <div className="step-label mt-2 fw-semibold">{step}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <div className="row">
                                                <div className="col-12 col-md-10 order-2 order-md-1">
                                                    <div>
                                                        {/* <button
                                                            className="btn btn-secondary btn-sm d-flex ms-auto my-3"
                                                            onClick={() => setViewTicketShow(false)}
                                                            type="button"
                                                        ><i className="fa-solid fa-arrow-left mt-1"></i>Back to Tickets</button> */}
                                                        <div className="card-title w-100">
                                                            <div className="d-flex d-lg-none justify-content-between align-items-center flex-wrap mb-2">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <h5 className="mb-0">
                                                                        Ticket History <span className="text-primary">({viewData?.TicketCode})</span>
                                                                    </h5>
                                                                    {/* <Popover placement="bottom" content={content} className="ms-1">
                                                                    <div className="text-hover-danger text-info cursor-pointer">
                                                                        <i className="fa-regular fa-circle-question fa-lg fa-bounce"></i>
                                                                    </div>
                                                                </Popover> */}
                                                                </div>

                                                                <span
                                                                    className={`badge ${getStatusBadgeClass(ticketDetails?.Status)} blink-badge border border-dark`}
                                                                    style={{
                                                                        fontSize: "0.9rem",
                                                                        padding: "8px 14px",
                                                                        borderRadius: "20px",
                                                                        fontWeight: 700,
                                                                        letterSpacing: "0.5px",
                                                                    }}
                                                                >
                                                                    {ticketDetails?.Status}
                                                                </span>
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
                                                                    {/* <Popover placement="bottom" content={content} className="ms-1">
                                                                    <div className="text-hover-danger text-info cursor-pointer">
                                                                        <i className="fa-regular fa-circle-question fa-lg fa-bounce"></i>
                                                                    </div>
                                                                </Popover> */}
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
                                                                    <span
                                                                        className={`badge ${getStatusBadgeClass(ticketDetails?.Status)} blink-badge border border-dark`}
                                                                        style={{
                                                                            fontSize: "0.95rem",
                                                                            padding: "8px 14px",
                                                                            borderRadius: "20px",
                                                                            fontWeight: 700,
                                                                            letterSpacing: "0.5px",
                                                                        }}
                                                                    >
                                                                        {ticketDetails?.Status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="table-responsive card shadow-sm border-0 p-3 rounded-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
                                                            <table className="table table-bordered table-sm mb-0">
                                                                <thead>
                                                                    <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                                                        <th style={{ minWidth: "100px" }}>When</th>
                                                                        <th style={{ minWidth: "135px" }}>Action</th>
                                                                        <th style={{ minWidth: "100px" }}>Status</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {Array.isArray(ticketLogs) && ticketLogs.length > 0 ? (
                                                                        ticketLogs.map((item, indx) => (
                                                                            <tr key={indx}>
                                                                                <td className="text-primary fw-semibold">{formatDate(item.Col2)}</td>
                                                                                <td className="fw-semibold fs-6 text-wrap">{item.Col1 || 'N/A'}</td>
                                                                                <td>
                                                                                    <span className={`badge ${getStatusBadgeClass(item.Label)}`}>
                                                                                        {item.Label}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan={3} className="text-center text-muted">No logs found</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <hr className="text-primary" />

                                                    {/* Comments */}
                                                    <div className="card shadow-sm border-0 p-3 rounded-3">
                                                        <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 text-primary mb-3">
                                                            <i className="fa-solid fa-comment-dots"></i>
                                                            Comments <span className="badge bg-light-primary">{ticketComments?.length || 0}</span>
                                                        </h5>

                                                        <div className="comments-chat rounded">
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
                                                                            // 👇 This makes matching case-insensitive
                                                                            isValidSearchTerm={(term) => !!term && term.length > 0}
                                                                        />
                                                                    </MentionsInput>
                                                                </Form.Item>

                                                                <div className="d-flex justify-content-end">
                                                                    <Button type="default" className="me-2" onClick={handleSaveAsDraft}>
                                                                        Save as Draft
                                                                    </Button>
                                                                    <Button type="primary" onClick={handleSubmit} disabled={commentSubmitLoading || !enteredContent.trim()}>
                                                                        {commentSubmitLoading ? 'Submitting...' : 'Comment'}
                                                                    </Button>
                                                                </div>
                                                            </Form>
                                                        </div>
                                                    </div>

                                                    <hr className="text-primary" />

                                                    {/* Pickup & Drop */}
                                                    {ticketDetails?.Status === 'APPROVED' &&
                                                        <div className="card shadow-sm border-0 p-3 rounded-3 mt-3">
                                                            <div className="d-flex align-items-center justify-content-between mb-3">
                                                                <h5 className="fw-bold mb-0 d-flex align-items-center gap-2 text-primary">
                                                                    <i className="fa-solid fa-truck-fast"></i>
                                                                    Pickup
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
                                                                                ? "Return date can only be set once the machine is picked up."
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
                                                                                ? `System Engineer ${pickedBy} picked up machine ${ticketDetails?.MachineName} for off-site repairon ${pickupDate}.`
                                                                                : returnedBy
                                                                                    ? `Machine ${ticketDetails?.MachineName} repaired and returned by ${returnedBy} from ${returnedOrg} on ${returnDate}; handed over to associate ${handedTo}.`
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
                                                                        ? "Pickup Machine"
                                                                        : ticketDetails?.Status === "PICKED UP"
                                                                            ? "Return Machine"
                                                                            : "Submit"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    }

                                                    <hr className="text-primary" />

                                                    {/* Requirements */}
                                                    <div className="card shadow-sm border-0 p-3 rounded-3">
                                                        <h5 class="fw-bold mb-0 d-flex align-items-center gap-2 text-primary mb-3">
                                                            <i class="fa-solid fa-clipboard-list"></i>
                                                            Requirements
                                                        </h5>

                                                        {/* Existing Requirements */}
                                                        {ticketRequirements?.length > 0 ? (
                                                            <div className="row gy-3" style={{
                                                                maxHeight: "300px",
                                                                overflowY: "auto",
                                                                paddingRight: "6px",
                                                                scrollbarWidth: "thin",
                                                                scrollbarColor: "#bbb transparent",
                                                            }}>
                                                                {ticketRequirements.map((item, index) => (
                                                                    <div className="col-12 col-sm-6 col-md-4" key={index}>
                                                                        <div className="card shadow-sm border-0 h-100 position-relative">
                                                                            {/* Action buttons */}
                                                                            <div className="position-absolute top-0 end-0 p-2 d-flex gap-2">
                                                                                {!item.Col4 ? (
                                                                                    <i
                                                                                        className={`fa-solid fa-check fs-5 ${approvedLoading ||
                                                                                            ticketDetails?.Status === "RESOLVED" ||
                                                                                            ticketDetails?.Status === "CLOSED" ||
                                                                                            !showReqApproveBtn
                                                                                            ? "text-secondary disabled-icon"
                                                                                            : "text-success cursor-pointer"
                                                                                            }`}
                                                                                        title="Approve Requirement"
                                                                                        onClick={() => {
                                                                                            if (
                                                                                                approvedLoading ||
                                                                                                ticketDetails?.Status === "RESOLVED" ||
                                                                                                ticketDetails?.Status === "CLOSED" ||
                                                                                                !showReqApproveBtn
                                                                                            ) {
                                                                                                return;
                                                                                            }
                                                                                            handleApproved(item);
                                                                                        }}
                                                                                    ></i>

                                                                                ) : (
                                                                                    <span className="badge badge-light-success align-self-center">Approved</span>
                                                                                )}

                                                                                <i
                                                                                    className={`fa-regular fa-trash-can text-danger fs-5 ${ticketDetails?.Status === 'RESOLVED' || ticketDetails?.Status === 'CLOSED' || reqSubmitLoading || !showDeleteBtn ? 'disabled-icon' : 'cursor-pointer'}`}
                                                                                    title="Delete Requirement"
                                                                                    style={{ cursor: "pointer" }}
                                                                                    onClick={() => handleDeleteRequirement(item)}
                                                                                ></i>
                                                                            </div>

                                                                            {/* Card body */}
                                                                            <div className="card-body">
                                                                                <h6 className="text-muted small mb-1">Name</h6>
                                                                                <p className="fw-semibold mb-3">{item.Col1}</p>

                                                                                <h6 className="text-muted small mb-1">Description</h6>
                                                                                <p className="fw-semibold mb-3">{item.Col2}</p>

                                                                                <h6 className="text-muted small mb-1">Quantity</h6>
                                                                                <p className="fw-semibold mb-0">{item.Col3}</p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-muted mb-3">No requirements found.</div>
                                                        )}

                                                        {/* Add Requirement */}
                                                        <p className="mt-4 mb-2 fw-bold fs-5">Add Requirement (if any)</p>
                                                        <div className="row g-2 align-items-end">
                                                            <div className="col-md-4 col-sm-6">
                                                                <label className="form-label">Name</label>
                                                                <input
                                                                    className="form-control form-control-sm"
                                                                    type="text"
                                                                    placeholder="Enter name"
                                                                    value={heading}
                                                                    onChange={(e) => setHeading(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="col-md-4 col-sm-6">
                                                                <label className="form-label">Description</label>
                                                                <input
                                                                    className="form-control form-control-sm"
                                                                    type="text"
                                                                    placeholder="Enter description"
                                                                    value={description}
                                                                    onChange={(e) => setDescription(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="col-md-2 col-sm-4">
                                                                <label className="form-label">Quantity</label>
                                                                <input
                                                                    className="form-control form-control-sm"
                                                                    type="number"
                                                                    min="1"
                                                                    placeholder="Enter Quantity"
                                                                    value={quantity}
                                                                    onChange={(e) => setQuantity(e.target.value)}
                                                                />
                                                            </div>
                                                            <div className="col-md-2 col-sm-6">
                                                                <button className="btn btn-primary btn-sm w-100"
                                                                    onClick={handleAddRequirement}
                                                                    disabled={ticketDetails?.Status === 'RESOLVED' || ticketDetails?.Status === 'CLOSED' || ticketDetails?.Status === 'CLOSED' || reqSubmitLoading}
                                                                >{reqSubmitLoading ? 'Submitting...' : 'Submit'}</button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <hr className="text-primary" />

                                                    {/* Uploaded Files */}
                                                    <div className="card shadow-sm border-0 p-3 rounded-3">
                                                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2 text-primary">
                                                            <i className="fa-solid fa-file-arrow-up"></i> Uploaded Files
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

                                                    <div className="mt-5">
                                                        <h5 class="fw-bold mb-0 d-flex align-items-center gap-2 text-primary mb-3">
                                                            <i class="fa-solid fa-screwdriver-wrench"></i>
                                                            Resolve Tickets
                                                        </h5>
                                                        <div className="mb-4">
                                                            <label className="form-label">Resolved Date<span className="text-danger fw-bold">*</span></label>
                                                            <input
                                                                type="date"
                                                                className={`form-control w-100 w-md-25 ${ticketDetails?.Status === 'RESOLVED' || ticketDetails?.Status === 'CLOSED' || !showResolveBtn ? 'cursor-not-allowed' : ''}`}
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
                                                                className={`btn btn-primary btn-sm px-5 d-flex ms-auto ${!["ASSIGNED", "PICKED UP", "REQ APPROVAL"].includes(ticketDetails?.Status) ||
                                                                        closingLoading ||
                                                                        !showResolveBtn
                                                                        ? "cursor-not-allowed opacity-75"
                                                                        : ""
                                                                    }`}
                                                                onClick={handleResolvedTicket}
                                                                disabled={
                                                                    !["ASSIGNED", "PICKED UP", "REQ APPROVAL"].includes(ticketDetails?.Status) ||
                                                                    closingLoading ||
                                                                    !showResolveBtn
                                                                }
                                                            >
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
                                        </>
                                    }
                                </div>
                            </div>

                            <div className="tab-pane fade" id="nav-alerts" role="tabpanel" aria-labelledby="nav-alerts-tab">
                                <div className="card">
                                    <div className="table-responsive" style={{
                                        maxHeight: "85vh",
                                        overflowY: "auto",
                                        overflowX: "auto",
                                        position: "relative",
                                    }}>
                                        <table className="table table-bordered fs-6 gy-5 d-none d-md-table w-100">
                                            <thead>
                                                <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                                    <th>S.No</th>
                                                    <th>Alert Code</th>
                                                    <th>AlertTitle</th>
                                                    <th>Occurrence Type</th>
                                                    <th>Scheduled Date</th>
                                                    <th>Message</th>
                                                </tr>
                                            </thead>
                                            <tbody className="fw-semibold text-gray-600">
                                                {mcnAlertsLoading ? (
                                                    <tr>
                                                        <td colSpan="8" className="text-center">
                                                            <div className="container"></div>
                                                        </td>
                                                    </tr>
                                                ) : alertsData && alertsData?.length > 0 ? (
                                                    alertsData?.map((item, index) => (
                                                        <tr key={index}>
                                                            <td>{index + 1}</td>
                                                            <td>
                                                                <a className="text-primary">{item.AlertCode}</a>
                                                            </td>
                                                            <td>{item.AlertTitle || 'N/A'}</td>
                                                            <td>{item.OcurrenceTypeNames || 'N/A'}</td>
                                                            <td>{formatDate(item.ScheduledDate)} </td>
                                                            <td style={{ maxWidth: "250px", whiteSpace: "normal" }}>
                                                                {expandedRows[index] ? item.Message : truncateText(item.Message, 100)}
                                                                {item.Message?.length > 100 && (
                                                                    <span
                                                                        className="text-primary fw-bold ms-2 cursor-pointer"
                                                                        style={{ cursor: "pointer" }}
                                                                        onClick={() => toggleReadMore(index)}
                                                                    >
                                                                        {expandedRows[index] ? "Show less" : "Read more"}
                                                                    </span>
                                                                )}
                                                            </td>

                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="8" className="text-center">
                                                            <p>No Data Available</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="list-group d-block d-md-none" style={{
                                        maxHeight: "90vh",
                                        overflowY: "auto",
                                    }}>
                                        <h4 className="text-primary text-center my-3">{machineData?.MachineName}</h4>
                                        <h5 className="ms-2 mb-3">Alerts List</h5>
                                        {mcnAlertsLoading ? (
                                            <div className="text-center py-4">
                                                <div className="spinner-border text-primary" role="status"></div>
                                            </div>
                                        ) : alertsData && alertsData?.length > 0 ? (
                                            alertsData?.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="list-group-item py-3 border-bottom d-flex flex-column my-2"
                                                >
                                                    <div className="d-flex justify-content-between">
                                                        <small className="text-primary fw-bold">{item.AlertCode}</small>
                                                    </div>
                                                    <div className="fw-semibold fs-6 text-dark mb-1">
                                                        <span className="me-2 text-muted">Alert Title:</span> {item.AlertTitle || "N/A"}
                                                    </div>
                                                    <div className="fw-semibold fs-6 text-dark mb-1">
                                                        <span className="me-2 text-muted">Occurence Type:</span> {item.OcurrenceTypeNames || "N/A"}
                                                    </div>
                                                    <div className="fw-semibold fs-6 text-dark mb-1">
                                                        <span className="me-2 text-muted">Scheduled Date:</span> {formatDate(item.ScheduledDate)}
                                                    </div>
                                                    <div className="fw-semibold fs-6 text-dark mb-1">
                                                        <span className="me-2 text-muted">Message:</span> {item.Message}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-muted py-3">No Data Available</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
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

                    .mentions__suggestions__list {
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                        margin-top: 4px;
                        z-index: 100;
                    }

                    .mentions__suggestions__item {
                        padding: 6px 10px;
                        cursor: pointer;
                    }

                    .mentions__suggestions__item--focused {
                        background: #e6f4ff;
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
                    .custom-nav-tabs .nav-link {
                        font-size: 1.1rem;
                        font-weight: 500;
                        color: #0d6efd;
                        background-color: #eaf4ff;
                        border: none;
                        margin-right: 5px;
                        border-radius: 0.5rem 0.5rem 0 0;
                        padding: 0.75rem 1.25rem;
                        transition: all 0.3s ease-in-out;
                    }

                    .custom-nav-tabs .nav-link:hover {
                        background-color: #d0e8ff;
                        color: #084298;
                    }

                    .custom-nav-tabs .nav-link.active {
                        background-color: #0d6efd;
                        color: #fff;
                        font-weight: 600;
                        box-shadow: 0 4px 8px rgba(13, 110, 253, 0.2);
                    }
                    .coming-soon {
                        max-width: 500px;
                        padding: 30px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        backdrop-filter: blur(10px);
                    }
                    .form-control, .btn {
                        border-radius: 30px;
                    }
                `}
            </style>
        </>
    )
}