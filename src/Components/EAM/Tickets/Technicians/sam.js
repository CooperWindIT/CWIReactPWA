import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { MentionsInput, Mention } from "react-mentions";
import { Form, Button, message } from 'antd';
import { fetchWithAuth } from "../../../../utils/api";

export default function TicketViewComments({ ticObj }) {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);

    const [ticketComments, setTicketComments] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [enteredContent, setEnteredContent] = useState("");
    const [plainTextContent, setPlainTextContent] = useState("");
    const [commentSubmitLoading, setCommentSubmitLoading] = useState(false);
    const [commentgetLoading, setCommentGetLoading] = useState(false);
    const [mentionedEmails, setMentionedEmails] = useState("");

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
    const messagesEndRef = useRef(null);

const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
};

useEffect(() => {
    scrollToBottom();
}, [ticketComments]); // Runs every time a new comment is added

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlTechTicketCommentsData");
    
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
                "ddlTechTicketCommentsData",
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

    const fetchTicketComments = async () => {
        setCommentGetLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/TicketOverView?TickId=${ticObj?.TicketId}&Id=${sessionUserData?.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                const resultData = data.ResultData;
                const ticketCommentRows = resultData.filter(ticket => ticket.Title === 'TicketComments');

                setTicketComments(ticketCommentRows);

            } else {
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching mcn tickets data:', error.message);
        } finally {
            setCommentGetLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && ticObj?.TicketId) {
            fetchTicketComments();
        }
    }, [sessionUserData, ticObj]);

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

    const handleCommentSubmit = async () => {

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
                TablePrimaryId: ticObj?.TicketId, // replace dynamically if needed
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
                setEnteredContent("");
                setMentionedEmails([]);
                setCommentSubmitLoading(false);
                fetchTicketComments();
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

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightComponents"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightComponents {
                            width: 40% !important;
                        }
                    }
                `}
            </style>
            <div>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Ticket Comments</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" 
                    style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        height: '100vh',
                        padding: 0
                    }}
                >
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
                                            // This makes matching case-insensitive
                                            isValidSearchTerm={(term) => !!term && term.length > 0}
                                        />
                                    </MentionsInput>
                                </Form.Item>

                                <div className="d-flex justify-content-end">
                                    <Button type="default" className="me-2" onClick={handleSaveAsDraft}>
                                        Save as Draft
                                    </Button>
                                    <Button type="primary" onClick={handleCommentSubmit} disabled={commentSubmitLoading || !enteredContent.trim()}>
                                        {commentSubmitLoading ? 'Submitting...' : 'Comment'}
                                    </Button>
                                </div>
                            </Form>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                .mentions-fixed-bottom textarea {
    min-height: 80px !important;
    max-height: 150px !important;
    border-radius: 8px !important;
    padding: 10px !important;
    border: 1px solid #d9d9d9 !important;
}

/* Ensure the suggestions popup goes UPWARDS so it isn't hidden by the screen edge */
.mentions__suggestions {
    bottom: 100% !important;
    top: auto !important;
    margin-bottom: 10px;
}

.avatar-circle {
    width: 35px;
    height: 35px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
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
`}
            </style>
        </div>
    );
};

TicketViewComments.propTypes = {
    ticObj: PropTypes.object.isRequired,
};
