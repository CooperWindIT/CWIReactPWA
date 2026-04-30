
import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import Base1 from "../../Config/Base1";
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../utils/api";
import { Collapse, Tooltip } from "antd";
import { CaretRightOutlined } from "@ant-design/icons";
import UplaodDocument from "./UploadDoc";
import EditDocVersion from "./EditVersion";
import EntityLogs from "./EntityLogs";
import { BASE_DOCS_API_GET } from "../../Config/Config";
import AddDocVersion from "./AddVersion";
import { formatToDDMMYYYY } from './../../../utils/dateFunc';
import RegisterMasterTypes from "../../Config/MasterTypes";
import AddAlert from './../../MasterAlerts/Add';
import { Select } from "antd";
import DocumentPreview from "./DocumentPreview";
import ViewAlert from './../../MasterAlerts/View';
import { Dropdown, Menu } from 'antd';

export default function DocVersion() {

    const navigate = useNavigate();
    const { Option } = Select;
    const location = useLocation();
    const { docId } = useParams();
    const currentYear = new Date().getFullYear();
    // const currentMonth = new Date().getMonth() + 1; // 1–12
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem("docDetails_activeTab") || "versions";
    });

    const [modules, setModules] = useState([]);
    const [navigationPath, setNavigationPath] = useState("");
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [docDetails, setDocDetails] = useState([]);
    const [sessionUserData, setSessionUserData] = useState([]);
    const [docVersions, setDocVersions] = useState([]);
    const [editVersionData, setEditVersionData] = useState([]);
    const [usersList, setUsersList] = useState(null);
    const [entityItem, setEntityItem] = useState([]);
    const [docItem, setDocItem] = useState([]);
    const [alertsList, setAlertsList] = useState([]);
    const [alertsLoading, setAlertsLoading] = useState(false);
    const [selectedAlert, setSelectedAlert] = useState(null);
    const [selectedYear, setSelectedYear] = useState('0');
    const [selectedMonth, setSelectedMonth] = useState('0');
    const [versionId, setVersionId] = useState(null);
    const [selectedVersionNumber, setSelectedVersionNumber] = useState(null);
    const [dataLoading, setDataLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [menuData, setMenuData] = useState([]);
    const [userDocTypePublishers, setUserDocTypePublishers] = useState([]);

    const [previewModal, setPreviewModal] = useState({
        show: false,
        item: null
    });

    const { Panel } = Collapse;
    // const getFileUrl = (filePath) =>
    //     `${BASE_DOCS_API_GET}${encodeURIComponent(filePath)}`;
    // const [showPreviewModal, setShowPreviewModal] = useState(false);


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
            setMenuData(parsedMenu)

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Documents"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        // localStorage.setItem("docDetails_activeTab", tabName);
    };

    const handleModuleClick = async (mod) => {
        localStorage.setItem("ModuleData", JSON.stringify(mod));

        const sessionUserData = JSON.parse(sessionStorage.getItem("userData") || "{}");
        try {
            const response = await fetchWithAuth(`auth/getmenu?OrgId=${sessionUserData.OrgId}&RoleId=${sessionUserData.RoleId}&ModuleId=${mod.Id}&UserId=${sessionUserData.Id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
            );

            if (response.ok) {
                const data = await response.json();
                const menuList = data.ResultData;

                if (menuList.length > 0 && menuList[0].MenuPath) {
                    sessionStorage.setItem("menuData", JSON.stringify(menuList));
                    sessionStorage.setItem("navigationPath", menuList[0].MenuPath);
                    navigate(menuList[0].MenuPath);
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Module unavailable',
                        text: 'You don’t have access to this module yet. Please contact your administrator for help.',
                        confirmButtonText: 'OK'
                    });
                    console.warn("No menu path available.");
                }
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Module unavailable',
                    text: 'You don’t have access to this module yet. Please contact your administrator for help.',
                    confirmButtonText: 'OK'
                });
                console.error("Failed to fetch menu data");
            }
        } catch (error) {
            console.error("Menu fetch error:", error);
        }
    };

    const fetchMenuData = async () => {
        try {
            // First check if accessModules already exists in sessionStorage
            const sessionAccessModules = sessionStorage.getItem("accessModules");

            if (sessionAccessModules) {
                // ✅ If already cached, just parse and set directly
                setModules(JSON.parse(sessionAccessModules));
                return; // stop further execution
            }

            // 🚀 Else fetch from API
            const response = await fetchWithAuth("auth/getModules", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                const allModules = data.ResultData || [];

                // Get user access IDs
                const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
                const accessIds = userData?.AccessToModules
                    ? userData.AccessToModules.split(",").map(Number)
                    : [];

                // Filter modules by access
                const filteredModules = allModules.filter((mod) =>
                    accessIds.includes(mod.Id)
                );

                // Save to state
                setModules(filteredModules);

                // 🔥 Cache in sessionStorage for next time
                sessionStorage.setItem("accessModules", JSON.stringify(filteredModules));
            } else {
                console.error("Failed to fetch menu data:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching menu data:", error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchMenuData();
        }
    }, [sessionUserData]);


    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlAssetVersionData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setUsersList(parsed.users || []);
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

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            setUsersList(usersFilteredData || []);

            sessionStorage.setItem(
                "ddlAssetVersionData",
                JSON.stringify({
                    users: usersFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUsersList([]);
        }
    };

    const fetchDocTypePublishers = async () => {
        try {
            const response = await fetchWithAuth(
                `EDM/GetUserDocTypePermissions?OrgId=${sessionUserData?.OrgId}&UserId=0&MasterTypeId=${docDetails?.ContentTypeId}&Type=Publishers`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setUserDocTypePublishers(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUserDocTypePublishers([]);
        }
    };

    useEffect(() => {
        if (docDetails && docDetails?.ContentTypeId) {
            fetchDocTypePublishers();
        }
    }, [docDetails?.ContentTypeId]);

    const fetchDocDetailsById = async () => {
        try {

            const response = await fetchWithAuth(
                `EDM/getDocumentById?OrgId=${sessionUserData?.OrgId}&Id=${docId}&UserId=${sessionUserData?.Id}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setDocDetails(data.ResultData[0] || []);
            // console.log(data.ResultData[0])

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDocDetails([]);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchDDLData();
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (sessionUserData?.OrgId && docId) {
            fetchDocDetailsById();
        }
    }, [sessionUserData, docId]);

    const fetchDocVersions = async () => {
        try {
            setDataLoading(true);
            const response = await fetchWithAuth(`EDM/getVersionsBYDocId?OrgId=${sessionUserData?.OrgId}&DocId=${docId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setDocVersions(data.ResultData);
            setDataLoading(false);

        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
            setDocVersions([]);
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && docId) {
            fetchDocVersions();
        }
    }, [sessionUserData, docId]);

    const handleEntityLogs = (item) => {
        setEntityItem(item);
    };
    const handleDocVersionAdd = (item) => {
        setDocItem(item);
    };

    const handleEditVersion = (item) => {
        setEditVersionData(item);
    };

    const handleDownloadDoc = async (item) => {
        // 1️⃣ Confirmation
        const getFileIcon = (fileName) => {
            if (!fileName) return '<i class="bi bi-file-earmark-text text-primary fs-1"></i>';
            const ext = fileName.split('.').pop().toLowerCase();
            if (ext === 'pdf') return '<i class="bi bi-file-earmark-pdf text-danger fs-1"></i>';
            if (['doc', 'docx'].includes(ext)) return '<i class="bi bi-file-earmark-word text-primary fs-1"></i>';
            if (['xls', 'xlsx', 'csv'].includes(ext)) return '<i class="bi bi-file-earmark-excel text-success fs-1"></i>';
            return '<i class="bi bi-file-earmark-arrow-down text-info fs-1"></i>';
        };

        const confirm = await Swal.fire({
            title: "Confirm Download",
            iconHtml: getFileIcon(item.DocName), // Custom icon based on file type
            html: `
                <div class="mt-3">
                    <div class="p-3 rounded border bg-light d-flex align-items-center mb-4">
                        <div class="me-3">
                            ${getFileIcon(item.DocName)}
                        </div>
                        <div class="text-start">
                            <div class="fw-bold text-dark fs-6 text-break">${item.DocName || "Document"}</div>
                            <div class="text-muted small">Version: ${item.VersionNumber || "1.0"}</div>
                        </div>
                    </div>
                    <div class="alert alert-dismissible bg-light-primary border border-primary border-dashed d-flex flex-column flex-sm-row p-2">
                        <i class="bi bi-shield-check fs-2tx text-primary me-4 mb-5 mb-sm-0"></i>
                        <div class="d-flex flex-column text-start">
                            <span class="fw-bold">Audit Notice</span>
                            <span class="small text-muted">This download will be logged with your User ID for compliance tracking.</span>
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-download me-2"></i>Download Now`,
            cancelButtonText: `<i class="bi bi-x-circle me-1"></i>Cancel`,
            confirmButtonColor: "#009ef7",
            cancelButtonColor: "#7e8299",
            customClass: {
                confirmButton: 'btn btn-primary',
                cancelButton: 'btn btn-light'
            }
        });

        if (!confirm.isConfirmed) return;

        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();

        try {
            // 2️⃣ Add Log API
            const logPayload = {
                TicketId: 0,
                Status: item.VersionStatus || "",
                Logs: `Document downloaded: ${docDetails?.DocName} (v${item.VersionNumber})`,
                LogDate: new Date().toISOString().slice(0, 19).replace("T", " "),
                ChangedBy: sessionUserData?.Id,
                ModuleId: moduleId,                 // Documents module
                EntityId: item.DocId,         // DocumentId
                EntityType: "Documents",
            };

            const response = await fetchWithAuth(`Portal/AddLogs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(logPayload),
            });

            const result = await response.json();

            // 3️⃣ Validate response
            if (
                response.ok &&
                result?.ResultData?.Status === "Success"
            ) {
                // 4️⃣ Trigger download
                const link = document.createElement("a");
                link.href = `${BASE_DOCS_API_GET}${item.FilePath}`;
                link.download = item.DocName || "document";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                Swal.fire({
                    icon: "success",
                    title: "Downloaded",
                    text: "Document downloaded successfully.",
                    timer: 1500,
                    showConfirmButton: false,
                });
            } else {
                throw new Error("Log failed");
            }

        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Download Failed",
                text: "Unable to download file. Please contact administrator.",
            });
        }
    };

    const handleApprove = async (item) => {
        if (!userDocTypePublishers?.length) {
            Swal.fire("No Users", "No users available for assignment.", "warning");
            return;
        }

        const userOptions = userDocTypePublishers
            .map(
                (u) =>
                    `<option value="${u.UserId}">${u.UserName}</option>`
            )
            .join("");

        const { value: selectedUserId } = await Swal.fire({
            title: "Approve Document",

            html: `
                <div style="text-align:left; overflow-x:hidden;">

                    <!-- Info Note -->
                <div style="
                    background:#f8f9fa;
                    border-left:4px solid #0d6efd;
                    padding:12px 14px;
                    border-radius:8px;
                    margin-bottom:15px;
                    font-size:1.4rem;        /* 👈 Increased */
                    line-height:1.6;       /* 👈 Better readability */
                    word-break:break-word;
                ">
                    <strong style="color:#0d6efd; font-size:1.05rem;">
                        Note:
                    </strong><br/>
                    Publisher assignment depends on document type:
<!--
                    <ul style="
                        margin:8px 0 0 20px;
                        padding:0;
                    ">
                        <li>
                            <b>Controlled:</b> Publisher should be 
                            <span style="color:#198754;font-weight:600;">Anandraj</span>.
                        </li>
                        <li>
                            <b>Uncontrolled:</b> Publisher will be decided by the respective manager.
                        </li>
                    </ul>
                    -->
                </div>


                    <!-- Dropdown -->
                    <label style="font-weight:600; margin-bottom:6px; display:block;">
                        Assign Publisher To
                    </label>

                    <select 
                        id="assignedUser"
                        style="
                            width:100%;
                            max-width:100%;
                            box-sizing:border-box;
                            padding:10px;
                            border-radius:8px;
                            border:1px solid #dee2e6;
                        "
                    >
                        <option value="">-- Select User --</option>
                        ${userOptions}
                    </select>

                </div>
                `,

            // icon: "success",
            showCancelButton: true,
            confirmButtonText: `
                   <i class="bi bi-check-lg"></i>Approve
               `,
            cancelButtonText: `<i class="bi bi-x-lg"></i>Cancel`,
            focusConfirm: false,
            buttonsStyling: true,
            customClass: {
                confirmButton: "btn btn-success",
                cancelButton: "btn btn-secondary",
                popup: "swal-approve-wide",
            },
            preConfirm: () => {
                const val = document.getElementById("assignedUser").value;
                if (!val) {
                    Swal.showValidationMessage("Please select a user to continue");
                    return false;
                }
                return val;
            },
        });

        if (!selectedUserId) return;

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "APPROVED",
            Priority: 1,
            JsonData: {
                Status: "APPROVED",
                VersionId: item.Id,
                AssignedUserId: Number(selectedUserId),
                DocId: item.DocId
            }
        };

        try {
            Swal.fire({
                title: "Approving...",
                text: "Please wait while we approve the asset",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            const res = await fetchWithAuth(`EDM/DocRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (result?.data?.result?.[0]?.ResponseCode === 2000) {
                Swal.fire({
                    title: "Approved Successfully",
                    text: "The document has been approved and assigned.",
                    icon: "success",
                    confirmButtonText: "OK",
                }).then(() => fetchDocVersions());
            } else {
                throw new Error("Unexpected response");
            }
        } catch (error) {
            Swal.fire({
                title: "Approval Failed",
                text: "Something went wrong. Please try again.",
                icon: "error",
            });
        }
    };

    const handleReject = async (item) => {
        const { value: reason } = await Swal.fire({
            title: "Reject Document",
            input: "textarea",
            inputPlaceholder: "Enter reason for rejection...",
            inputAttributes: { "aria-label": "Type reason here" },
            confirmButtonText: `
                   <i class="bi bi-check-lg text-white" ></i> Ok
               `,
            cancelButtonText: `<i class="bi bi-x-lg text-white" ></i> Cancel`,
            showCancelButton: true,
            preConfirm: (value) => {
                if (!value) {
                    Swal.showValidationMessage("Please enter a reason");
                }
                return value;
            }
        });

        if (!reason) return;

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "REJECTED",
            Priority: 1,
            JsonData: {
                Status: "REJECTED",
                VersionId: item.Id,
                DocId: item.DocId,
                Reason: reason
            }
        };

        try {
            const res = await fetchWithAuth(`EDM/DocRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.data.result[0].ResponseCode === 2000) {
                Swal.fire({
                    title: "Success",
                    text: "Version rejcted successfully.",
                    icon: "success",
                }).then(() => fetchDocVersions());
            }
            // Swal.fire("Rejected", "Rejected successfully.", "success");

        } catch (error) {
            Swal.fire("Error", "Rejection failed!", "error");
        }
    };

    const handlePublish = async (item) => {
        const { DocId, Id, VersionNumber } = item;

        const hasOldVersion = (docVersions?.length || 0) > 1;
        const oldVersion = hasOldVersion ? docVersions?.[1] : null;
        const oldVersionId = oldVersion?.Id || 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const oldExpiryDate = oldVersion?.ExpiryDate ? new Date(oldVersion.ExpiryDate) : null;
        if (oldExpiryDate) {
            oldExpiryDate.setHours(0, 0, 0, 0);
        }

        const shouldWarnOldAlert =
            !!oldVersionId && !!oldExpiryDate && oldExpiryDate >= today;


        // 1️⃣ Confirmation dialog with input
        const confirm = await Swal.fire({
            title: "Publish Document?",
            icon: "question",
            width: "600px",
            customClass: {
                container: "my-swal-height",
                htmlContainer: "p-1",
                title: "swal-publish-title",
                popup: "swal-publish-popup",
            },

            html: `
                <div class="text-start">
                    <p class="mb-1 lh-1">
                        <b class="text-gray-700">Document Name:</b> 
                        <span class="text-dark">${docDetails?.DocName || "-"}</span>
                    </p>
                    <p class="mb-4 lh-1">
                        <b class="text-gray-700">Version:</b> 
                        <span class="text-dark">${VersionNumber}</span>
                    </p>
        
                    <div class="d-flex align-items-center mb-4">
                        <label class="form-label fw-bold me-2 mb-0 text-nowrap">Document Number:</label>
                        <input 
                            id="docNumberInput" 
                            class="form-control w-50" 
                            placeholder="Enter document number"
                            style="height: 2.7rem;"
                        />
                    </div>
        
                    ${shouldWarnOldAlert
                    ? `
                            <div class="alert alert-custom alert-light-warning d-flex align-items-center mb-3">
                                <div class="d-flex flex-column">
                                    <h6 class="text-warning fw-bold mb-1">
                                        <i class="bi bi-bell me-1"></i> Alert Notice
                                    </h6>
                                    <span class="fs-7">
                                       Your previous document version alerts will be automatically disabled after this document is published.
                                    </span>
                                </div>
                            </div>
                            `
                    : ""
                }
        
                    <div class="alert alert-custom alert-light-danger d-flex align-items-center">
                        <div class="d-flex flex-column">
                            <h6 class="text-danger fw-bold">
                                <i class="bi bi-exclamation-triangle text-danger me-1"></i>Final Publication Warning
                            </h6>
                            <span class="fs-7">
                                Please review all details carefully. <strong>Once published, this version becomes read-only</strong> and cannot be edited.
                            </span>
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-check-lg text-white"></i> Yes, Publish`,
            cancelButtonText: `<i class="bi bi-x-lg text-white"></i> No`,
            confirmButtonColor: "#0d6efd",
            cancelButtonColor: "#6c757d",
            preConfirm: () => {
                const docNumber = document.getElementById("docNumberInput").value;
                if (!docNumber) {
                    Swal.showValidationMessage("Document Number is required");
                    return false;
                }
                return docNumber;
            }
        });

        if (!confirm.isConfirmed) return; // ❌ User clicked NO

        const docNumber = confirm.value; // ✅ value from input

        // 2️⃣ API payload
        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "PUBLISHED",
            Priority: 1,
            JsonData: {
                Status: "PUBLISHED",
                VersionId: Id,
                AssignedUserId: sessionUserData?.Id,
                DocId: DocId,
                DocNumber: docNumber,
                OldVersionId: oldVersionId,
            }
        };

        try {
            const res = await fetchWithAuth(`EDM/DocRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (result?.data?.result?.[0]?.ResponseCode === 2000) {
                Swal.fire({
                    title: "Published!",
                    text: "Document has been published successfully.",
                    icon: "success",
                }).then(() => {
                    fetchDocVersions();
                    fetchDocDetailsById();
                });
            } else if (result?.data?.result?.[0]?.ResponseCode === 4000) {
                Swal.fire({
                    title: "Failed!",
                    text: result?.data?.result?.[0]?.Message || "Document Number already exists. Please use a different number.",
                    icon: "info",
                });
            } else {
                Swal.fire("Error", "Failed to publish document.", "error");
            }

        } catch (error) {
            Swal.fire("Error", "Publishing failed. Please try again.", "error");
        }
    };

    const handleRequestApproval = async (item) => {
        const {
            DocId,
            Id,
            VersionNumber
        } = item;

        // 1️⃣ Swal with textarea
        const { isConfirmed } = await Swal.fire({
            title: "Request Approval",
            icon: "info",
            width: '500px', // Slightly wider to fit the alert nicely
            html: `
                <div class="text-start">
                    <div class="mb-4 lh-1">
                        <p class="mb-1"><b>Document:</b> ${docDetails?.DocName || "-"}</p>
                        <p class="mb-0"><b>Version:</b> ${VersionNumber}</p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-send-exclamation text-white"></i> Send for Approval`,
            cancelButtonText: `<i class="bi bi-x-lg text-white"></i> Cancel`,
            confirmButtonColor: "#ffc107",
            cancelButtonColor: "#6c757d",
        });

        if (!isConfirmed) return;

        // 2️⃣ API Payload
        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "PENDING APPROVAL",
            Priority: 1,
            JsonData: {
                VersionId: Id,
                DocId: DocId,
            }
        };

        try {
            const res = await fetchWithAuth(`EDM/DocRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (result?.data?.result?.[0]?.ResponseCode === 2000) {
                Swal.fire({
                    title: "Sent!",
                    text: "Document has been sent for approval.",
                    icon: "success",
                }).then(() => {
                    fetchDocVersions();
                });
            } else if (result?.data?.result?.[0]?.ResponseCode === 4000) {
                Swal.fire({
                    title: "Sent!",
                    text: result?.data?.result?.[0]?.Message,
                    icon: "info",
                }).then(() => {
                    fetchDocVersions();
                });
            }

            else {
                Swal.fire("Error", "Failed to request approval.", "error");
            }

        } catch (error) {
            Swal.fire("Error", "Request approval failed.", "error");
        }
    };


    // Alerts
    const fetchAlertsByDocId = async () => {
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        setAlertsLoading(true);
        try {
            const response = await fetchWithAuth(`EDM/GetEDMAlertsMonth?OrgId=${sessionUserData?.OrgId}&ModuleId=${moduleId}&TableId=${versionId}&month=${selectedMonth}&year=${selectedYear}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const normalizedAlerts = Array.isArray(data?.ResultData)
                ? data.ResultData
                : [];

            setAlertsList(normalizedAlerts);
            setAlertsLoading(false);
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
            setAlertsList([]);
            setAlertsLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && versionId && selectedYear && selectedMonth) {
            fetchAlertsByDocId();
        }
    }, [sessionUserData, versionId, selectedYear, selectedMonth]);

    const handleAlertClick = (alert) => {
        setSelectedAlert(alert);

        const offcanvasEl = document.getElementById("offcanvasRightViewMasterAlert");
        if (offcanvasEl) {
            const bsOffcanvas = new window.bootstrap.Offcanvas(offcanvasEl);
            bsOffcanvas.show();
        }
    };

    const handleOpenPreview = (item) => {
        setPreviewModal({ show: true, item: item });
    };

    const years = Array.from(
        { length: 5 },
        (_, i) => (currentYear - 2) + i
    );

    const months = [
        { value: '0', label: "All" },
        { value: 1, label: "January" },
        { value: 2, label: "February" },
        { value: 3, label: "March" },
        { value: 4, label: "April" },
        { value: 5, label: "May" },
        { value: 6, label: "June" },
        { value: 7, label: "July" },
        { value: 8, label: "August" },
        { value: 9, label: "September" },
        { value: 10, label: "October" },
        { value: 11, label: "November" },
        { value: 12, label: "December" },
    ];

    const handleDeleteDoc = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            html: `
                <div>
                    <div><strong>Document Name:</strong> ${item?.DocName || "-"}</div>
                    <div class="mt-2 text-danger">Do you want to delete this document version?</div>
                </div>
            `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: '<i class="fa-solid fa-trash me-2"></i> Yes, delete it!',
            cancelButtonText: '<i class="fa-solid fa-xmark me-2"></i> Cancel',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        UpdatedBy: sessionUserData.Id,
                        DocId: item.Id,
                        OrgId: sessionUserData.OrgId,
                        VersionId: item.Id,
                    };

                    const response = await fetchWithAuth(`EDM/InactiveDocVersion`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        fetchDocVersions();
                        Swal.fire("Success!", "Vesrion has been deleted.", "success");
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete vesrion.", "error");
                    }
                } catch (error) {
                    console.error("Error during vesrion delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    const showApprove = sessionActionIds?.includes(4);
    const showReject = sessionActionIds?.includes(5);
    const showViewLogs = sessionActionIds?.includes(28);
    const showDelete = sessionActionIds?.includes(11);
    const showAlertTab = sessionActionIds?.includes(33);

    const getActions = (item) => {
        const status = item.VersionStatus?.toUpperCase() || "";
        // console.log(status)

        return {
            canViewLogs: showViewLogs,
            canPreview: true,
            canDownload: docDetails?.CanWrite,
            canEdit: (status !== "APPROVED" && status !== "PUBLISHED") && (sessionUserData.userId === item.createdby || sessionUserData.roleId === 5) && docDetails?.CanWrite,
            canReqApproval: (status === "DRAFT" || status === "REJECTED"),
            canApprove: showApprove && status === "PENDING APPROVAL",
            canReject: showReject && (status === "PENDING APPROVAL" || status === "APPROVED"),
            canPublish: (status === "APPROVED") && (item.PublishedBy === sessionUserData?.Id),
            canDelete: showDelete && status !== "APPROVED" && status !== "PUBLISHED",
        };
    };

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];
    const hasVersions = (docVersions?.length || 0) > 0;
    const latestStatus = docVersions?.[0]?.VersionStatus;

    const isAddDisabled = hasVersions
        ? !(latestStatus === "PUBLISHED" && docDetails?.CanWrite)
        : !docDetails?.CanWrite;


    return (
        <Base1>
            {dataLoading && (
                <div className="page-loading-overlay">
                    <div className="loading-content">
                        <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}></div>

                    </div>
                </div>
            )}
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-md-block d-none">
                        <div className="d-flex align-items-center gap-2">
                            <div className="dropdown d-inline-block me-2">
                                <span
                                    className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                    style={{ position: "relative", zIndex: 10 }}
                                >
                                    <span className="menu-title">
                                        <i className="fa-solid fa-grip me-1"></i> Portal
                                    </span>
                                </span>

                                <ul className="dropdown-menu shadow">
                                    {modules.map((mod, index) => {
                                        const isActive = location.pathname
                                            .toLowerCase()
                                            .includes(mod.ModuleName.toLowerCase());

                                        return (
                                            <li
                                                key={index}
                                                className={`mb-1 ${isActive ? "active-module" : ""}`}
                                            >
                                                <a
                                                    className="dropdown-item d-flex align-items-center gap-2 module-item"
                                                    onClick={() => handleModuleClick(mod)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <i
                                                        className={`fas fa-${mod.ImageIcon}`}
                                                        style={{
                                                            color: iconColors[index % iconColors.length],
                                                            textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                                        }}
                                                    ></i>
                                                    <span>{mod.ModuleName}</span>
                                                </a>
                                            </li>
                                        );
                                    })}
                                    {sessionUserData?.RoleId === 1 && (
                                        <a
                                            href={`https://betasuperportal.cooperwind.online/`}
                                            target="_blank"
                                        >
                                            <li className="dropdown-item d-flex align-items-center gap-2 module-item">
                                                <i
                                                    className={`fa-solid fa-user-tie`}
                                                    style={{
                                                        color: "#c8e6c9",
                                                        textShadow: "1px 1px 3px rgba(0, 0, 0, 0.5)",
                                                    }}
                                                ></i>
                                                <span>Super Portal</span>
                                            </li>
                                        </a>
                                    )}
                                    <li
                                        className="dropdown-item d-flex align-items-center gap-2 module-item"
                                        onClick={() => navigate("/user-modules")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <i
                                            className="fa-solid fa-arrow-left"
                                            style={{
                                                color: "#ffccbc",
                                                textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                            }}
                                        ></i>
                                        <span>Go Back to Portal</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="d-flex align-items-center">
                                {menuData?.map((menu) => {
                                    const hasSubItems = menu.SubItems && menu.SubItems.length > 0;

                                    if (hasSubItems) {
                                        const subMenu = (
                                            <Menu className="shadow-sm border-0 rounded-3 mt-2">
                                                {menu.SubItems.map((sub) => (
                                                    <Menu.Item key={sub.AppMenuId} className="p-3">
                                                        <a
                                                            href={sub.MenuPath.startsWith('/') ? sub.MenuPath : `/${sub.MenuPath}`}
                                                            className="text-gray-700 fw-bold text-decoration-none"
                                                        >
                                                            <i className="bi bi-arrow-return-right me-1"></i>
                                                            {sub.MenuName}
                                                        </a>
                                                    </Menu.Item>
                                                ))}
                                            </Menu>
                                        );

                                        return (
                                            <Dropdown overlay={subMenu} trigger={['hover']} key={menu.AppMenuId}>
                                                <span className="menu-link bg-white shadow-sm me-2 cursor-pointer border border-gray-100">
                                                    <span className="menu-title">
                                                        <i className={`${menu.IconName || 'bi bi-grid'} text-primary me-2`}></i>
                                                        {menu.MenuName}
                                                    </span>
                                                    <i className="bi bi-chevron-down ms-2 fs-9"></i>
                                                </span>
                                            </Dropdown>
                                        );
                                    }
                                    return (
                                        <a
                                            key={menu.AppMenuId}
                                            href={menu.MenuPath}
                                            style={{ position: "relative", zIndex: 10, textDecoration: 'none' }}
                                        >
                                            <span className={`menu-link bg-white shadow-sm me-2 cursor-pointer ${window.location.pathname === menu.MenuPath ? 'active border-primary' : ''}`}>
                                                <span className="menu-title text-gray-800">
                                                    <i className={`${menu.IconName} text-primary me-2`}></i>
                                                    {menu.MenuName}
                                                </span>
                                            </span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="page-title d-md-none d-block">
                        <div className="d-flex align-items-center gap-2">
                            <div className="dropdown d-inline-block">
                                <span
                                    className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                    style={{ position: "relative", zIndex: 10 }}
                                >
                                    <span className="menu-title">
                                        <i className="fa-solid fa-grip me-1"></i>
                                    </span>
                                </span>

                                <ul className="dropdown-menu shadow">
                                    {modules?.map((mod, index) => {
                                        const isActive = location.pathname.toLowerCase().includes(
                                            mod.ModuleName.toLowerCase()
                                        );

                                        return (
                                            <li
                                                key={index}
                                                className={`mb-1 ${isActive ? "active-module" : ""}`}
                                            >
                                                <a
                                                    className="dropdown-item d-flex align-items-center gap-2 module-item"
                                                    onClick={() => handleModuleClick(mod)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <i
                                                        className={`fas fa-${mod.ImageIcon}`}
                                                        style={{
                                                            color: iconColors[index % iconColors.length],
                                                            textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                                        }}
                                                    ></i>
                                                    <span>{mod.ModuleName}</span>
                                                </a>
                                            </li>
                                        );
                                    })}
                                    {sessionUserData?.RoleId === 1 && (
                                        <a href={`https://betasuperportal.cooperwind.online/`} target="_blank">
                                            <li className="dropdown-item d-flex align-items-center gap-2 module-item">
                                                <i
                                                    className={`fa-solid fa-user-tie`}
                                                    style={{
                                                        color: '#c8e6c9',
                                                        textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)',
                                                    }}
                                                ></i>
                                                <span>Super Portal</span>
                                            </li>
                                        </a>
                                    )}
                                    <li className="dropdown-item d-flex align-items-center gap-2 module-item"
                                        onClick={() => navigate("/user-modules")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <i
                                            className="fa-solid fa-arrow-left"
                                            style={{
                                                color: "#ffccbc",
                                                textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                            }}
                                        ></i>
                                        <span>Go Back to Portal</span>
                                    </li>
                                </ul>
                            </div>
                            {/* <a href='/edm/edm-dashboard' style={{ position: "relative", zIndex: 10 }}>
                                <span className="menu-link bg-white shadow-sm me-2">
                                    <span className="menu-title"><i className="bi bi-columns-gap text-primary fs-4"></i></span>
                                    <span className="menu-arrow"></span>
                                </span>
                            </a>
                            <a href='/edm/documents' style={{ position: "relative", zIndex: 10 }}>
                                <span className="menu-link bg-white shadow-sm me-2 active">
                                    <span className="menu-title"><i className="fa-solid fa-file-invoice fs-4"></i></span>
                                    <span className="menu-arrow"></span>
                                </span>
                            </a> */}
                            <div className="d-flex align-items-center">
                                {menuData?.map((menu) => {
                                    const hasSubItems = menu.SubItems && menu.SubItems.length > 0;

                                    if (hasSubItems) {
                                        const subMenu = (
                                            <Menu className="shadow-sm border-0 rounded-3 mt-2">
                                                {menu.SubItems.map((sub) => (
                                                    <Menu.Item key={sub.AppMenuId} className="p-3">
                                                        <a
                                                            href={sub.MenuPath.startsWith('/') ? sub.MenuPath : `/${sub.MenuPath}`}
                                                            className="text-gray-700 fw-bold text-decoration-none"
                                                        >
                                                            <i className="bi bi-arrow-return-right me-1"></i>
                                                            {sub.MenuName}
                                                        </a>
                                                    </Menu.Item>
                                                ))}
                                            </Menu>
                                        );

                                        return (
                                            <Dropdown overlay={subMenu} trigger={['hover']} key={menu.AppMenuId}>
                                                <span className="menu-link bg-white shadow-sm me-2 cursor-pointer border border-gray-100">
                                                    <span className="menu-title">
                                                        <i className={`${menu.IconName || 'bi bi-grid'} text-primary me-2`}></i>
                                                        {menu.MenuName}
                                                    </span>
                                                    <i className="bi bi-chevron-down ms-2 fs-9"></i>
                                                </span>
                                            </Dropdown>
                                        );
                                    }
                                    return (
                                        <a
                                            key={menu.AppMenuId}
                                            href={menu.MenuPath}
                                            style={{ position: "relative", zIndex: 10, textDecoration: 'none' }}
                                        >
                                            <span className={`menu-link bg-white shadow-sm me-2 cursor-pointer ${window.location.pathname === menu.MenuPath ? 'active border-primary' : ''}`}>
                                                <span className="menu-title text-gray-800">
                                                    <i className={`${menu.IconName} text-primary me-2`}></i>
                                                </span>
                                            </span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="col-auto text-end d-flex align-items-center justify-content-end gap-2 p-2 bg-white rounded-4 shadow-sm">
                        <Tooltip
                            title={isAddDisabled ? "You can only add a new version once the current version is Published." : ""}
                            placement="top"
                        >
                            <span className="d-inline-block">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-light-primary shadow fw-bold border border-primary d-flex align-items-center"
                                    onClick={() => docDetails && handleDocVersionAdd(docDetails)}
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightAddDocVersion"
                                    disabled={isAddDisabled}
                                    style={isAddDisabled ? { pointerEvents: 'none' } : {}}
                                >
                                    <i className="bi bi-file-arrow-up fs-5"></i>
                                    <span className="d-none d-md-inline ms-1">Add Version</span>
                                </button>
                            </span>
                        </Tooltip>

                        <Link to="/edm/documents" className="text-decoration-none">
                            <button className="btn btn-sm btn-light-dark shadow border border-dark d-flex align-items-center">
                                <i className="fa-solid fa-arrow-left"></i>
                                <span className="d-none d-md-inline ms-1">Go Back</span>
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2 mb-10">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card shadow-sm border-0 rounded-4 mb-4 overflow-hidden">
                        <div className="card-header border-0 pt-5 pb-2 bg-light-primary d-flex justify-content-between align-items-center">
                            <h4 className="fw-bolder text-dark m-0 d-flex align-items-center">
                                <i className="fa-solid fa-circle-info text-primary me-2"></i>
                                Document Details -
                                <span className="ms-2 px-2 py-1 bg-light-primary text-primary rounded fs-6 fw-bold border border-primary border-opacity-25">
                                    {docDetails?.DocumentCode}
                                </span>
                            </h4>
                            <span
                                className="badge rounded-pill px-4 py-2 text-white blink-pulse"
                                style={{
                                    background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
                                    fontSize: "1rem",
                                    fontWeight: "800",
                                    letterSpacing: "1px",
                                    border: "2px solid rgba(255, 255, 255, 0.2)"
                                }}
                            >
                                <i className="fa-solid fa-code-branch me-2"></i>
                                VERSION {docDetails?.CurrentVersion}
                            </span>
                        </div>

                        <div className="card-body pt-4">
                            <div className="d-flex flex-wrap align-items-center gap-4 gap-md-10 mb-5 pb-5 border-bottom">
                                <div className="min-w-125px">
                                    <label className="text-muted fs-9 text-uppercase fw-bolder d-block lh-1 mb-2">Document Name</label>
                                    <div className="fw-bold fs-7 text-primary">{docDetails?.DocName}</div>
                                </div>

                                <div className="vr d-none d-md-block h-30px opacity-25"></div>

                                <div className="min-w-100px">
                                    <label className="text-muted fs-9 text-uppercase fw-bolder d-block lh-1 mb-2">Department</label>
                                    <span className="badge badge-light-info fw-bold fs-8 px-3 py-1">{docDetails?.DeptName || 'N/A'}</span>
                                </div>

                                {docDetails?.ExpiryDate && (
                                    <>
                                        <div className="vr d-none d-md-block h-30px opacity-25"></div>
                                        <div className="min-w-100px">
                                            <label className="text-muted fs-9 text-uppercase fw-bolder d-block lh-1 mb-2">Expiry Date</label>
                                            <span className="badge badge-light-danger fw-bold fs-8 px-3 py-1">{formatToDDMMYYYY(docDetails?.ExpiryDate) || 'N/A'}</span>
                                        </div>
                                    </>
                                )}

                                <div className="vr d-none d-md-block h-30px opacity-25"></div>

                                <div className="min-w-150px">
                                    <label className="text-muted fs-9 text-uppercase fw-bolder d-block lh-1 mb-2">Author & Date</label>
                                    <div className="d-flex align-items-center fs-7 fw-semibold text-gray-700">
                                        <span className="text-dark fw-bold me-2">{docDetails?.Author || 'N/A'}</span>
                                        <span className="text-gray-400">|</span>
                                        <span className="ms-2">{formatToDDMMYYYY(docDetails?.VersionCreated)}</span>
                                    </div>
                                </div>

                                <div className="vr d-none d-md-block h-30px opacity-25"></div>
                                <div className="min-w-100px">
                                    <label className="text-muted fs-9 text-uppercase fw-bolder d-block lh-1 mb-2">Document Type</label>
                                    <div className="fw-bold fs-7 text-gray-600">{docDetails?.TypeName}</div>
                                </div>
                            </div>
                            <div className="row g-5">
                                <div className="col-md-7">
                                    <div className="bg-light-secondary p-3 rounded border border-dashed border-gray-300">
                                        <label className="text-muted fs-9 text-uppercase fw-bolder mb-1 d-block">Description</label>
                                        <div className="fs-7 text-gray-800 lh-sm">{docDetails?.Description}</div>
                                    </div>
                                </div>

                                {docDetails?.Comments && (
                                    <div className="col-md-5">
                                        <label className="text-muted fs-9 text-uppercase fw-bolder mb-1 d-block">Comment</label>
                                        <div className="d-flex gap-2">
                                            <i className="fa-solid fa-comment-dots text-gray-400 fs-9 mt-1"></i>
                                            <div className="fs-7 text-gray-600 fst-italic">{docDetails?.Comments}</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-3">
                        <div className="d-flex gap-3 tab-header align-items-center flex-wrap">
                            <span
                                className={`tab-item ${activeTab === "versions" ? "active" : ""}`}
                                onClick={() => handleTabChange("versions")}
                            >
                                <i className="bi bi-files me-1"></i> Versions
                            </span>

                            {/* {showAlertTab && (
                                <span
                                    className={`tab-item ${activeTab === "alerts" ? "active" : ""}`}
                                    onClick={() => handleTabChange("alerts")}
                                >
                                    <i className="bi bi-bell me-1"></i> Alerts
                                </span>
                            )} */}
                        </div>

                        <div className="d-flex gap-2 flex-wrap justify-content-md-end bg-white rounded-4 shadow-sm p-2">
                            <Tooltip title="Alerts can be registered only for the current version automatically.">
                                <button
                                    className="btn btn-primary btn-sm"
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightAlertAdd"
                                >
                                    <i className="bi bi-plus-circle me-1"></i>
                                    Register Alert
                                </button>
                            </Tooltip>

                            <Tooltip title="You are not able to add alert types, contact super admin">
                                <span>
                                    <button
                                        className="btn btn-info btn-sm"
                                        data-bs-toggle="offcanvas"
                                        data-bs-target="#offcanvasRightAddMasterTypes"
                                        disabled={true}
                                    >
                                        <i className="bi bi-gear me-1"></i>
                                        Alert Types
                                    </button>
                                </span>
                            </Tooltip>
                        </div>
                    </div>

                    {activeTab === "versions" && (
                        <div className="card tab-content">
                            <div className="card-body" style={{ maxHeight: "30rem", overflowY: "auto" }}>
                                <Collapse
                                    accordion
                                    // activeKey={[]}
                                    expandIconPosition="start"
                                    expandIcon={({ isActive }) => (
                                        <CaretRightOutlined rotate={isActive ? 90 : 0} />
                                    )}
                                    style={{ background: "white" }}
                                >
                                    {Array.isArray(docVersions) && docVersions?.map((item, index) => {
                                        const statusColor =
                                            item.VersionStatus === "DRAFT" ? "warning" :
                                                item.VersionStatus === "APPROVED" ? "primary" :
                                                    item.VersionStatus === "REJECTED" ? "danger" :
                                                        item.VersionStatus === "PUBLISHED" ? "success" : "info";

                                        const isLastRecord = index === 0;
                                        const status = item.VersionStatus?.toUpperCase() || "";
                                        const isManager = sessionUserData?.RoleId === 5;
                                        const isCreator = sessionUserData?.Id === item.CreatedBy;
                                        const isPublished = status === "PUBLISHED";

                                        const hasOldVersionAccess = isManager || isCreator || !isPublished;
                                        if (!hasOldVersionAccess) return null;


                                        // const hasOldVersionAccess = !latestPublished || !isOldVersion || isManager || isCreator;

                                        const baseActions = getActions(item);

                                        const actions = hasOldVersionAccess
                                            ? baseActions
                                            : {
                                                ...baseActions,
                                                canPreview: false,
                                                canDownload: false,
                                                canEdit: false,
                                                canReqApproval: false,
                                                canApprove: false,
                                                canReject: false,
                                                canPublish: false,
                                                canDelete: false,
                                            };

                                        return (
                                            <Panel key={index}
                                                header={
                                                    <div className={`d-flex flex-wrap align-items-center gap-2 ${!hasOldVersionAccess ? "old-version-blur" : ""}`}>
                                                        <span className="fw-semibold">
                                                            Version {item.VersionNumber}
                                                        </span>

                                                        <span className={`badge badge-light-${statusColor} border border-${statusColor}`}>
                                                            {item.VersionStatus}
                                                        </span>

                                                        <div className="d-flex align-items-center bg-light-secondary px-3 py-1 rounded-pill">
                                                            <i className="bi bi-person-circle text-gray-600 me-2"></i>
                                                            <span className="text-gray-700 fw-semibold fs-7">{item.UserName}</span>
                                                        </div>

                                                        {item.VersionStatus === "PUBLISHED" && item.DocNumber && (
                                                            <>
                                                                <div className="vr h-15px mx-1 text-gray-400"></div>
                                                                <span className="text-muted fs-8 fw-bold">
                                                                    ID: <span className="text-dark">{item.DocNumber}</span>
                                                                </span>
                                                            </>
                                                        )}

                                                        {item.ExpiryDate && (
                                                            <>
                                                                <div className="vr h-15px mx-1 text-gray-600 mt-2"></div>
                                                                <span className="text-muted fs-8 fw-bold">
                                                                    Expiry Date: <span className="text-danger">{formatToDDMMYYYY(item.ExpiryDate)}</span>
                                                                </span>
                                                            </>
                                                        )}

                                                        {!hasOldVersionAccess && (
                                                            <span className="badge badge-light-danger border border-danger">
                                                                No Access
                                                            </span>
                                                        )}
                                                    </div>
                                                }

                                                // ✅ DESKTOP actions
                                                extra={
                                                    <div className="d-none d-md-flex gap-2 flex-wrap">
                                                        <span
                                                            className="badge badge-light-info fs-7 fw-bold"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleTabChange("alerts");
                                                                setVersionId(item.Id);
                                                                setSelectedVersionNumber(item.VersionNumber);
                                                            }}
                                                            style={{ cursor: "pointer" }}

                                                        >
                                                            <i class="bi bi-bell me-2 text-info"></i>Alerts
                                                        </span>
                                                        {actions.canViewLogs && (
                                                            <span
                                                                className="badge badge-light-primary fs-7 fw-bold"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEntityLogs(item);
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                                data-bs-toggle="offcanvas"
                                                                data-bs-target="#offcanvasRightEntityLogs"
                                                                aria-controls="offcanvasRightEntityLogs"
                                                            >
                                                                <i className="fa-regular fa-eye me-2"></i>Logs
                                                            </span>
                                                        )}
                                                        {actions.canPreview && (
                                                            <span
                                                                className="badge badge-light-warning fs-7 fw-bold"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenPreview(item);
                                                                }}
                                                            >
                                                                <i className="fa-solid fa-expand me-2"></i>Preview
                                                            </span>
                                                        )}
                                                        {actions.canDownload && (
                                                            <span
                                                                className="badge badge-light-dark fs-7 fw-bold border"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadDoc(item);
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                <i className="fa-solid fa-download me-2"></i>Download
                                                            </span>
                                                        )}
                                                        {actions.canEdit && (
                                                            <span
                                                                className="badge badge-light-primary fs-7 fw-bold"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditVersion(item);
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                                data-bs-toggle="offcanvas"
                                                                data-bs-target="#offcanvasRightEditDocVer"
                                                                aria-controls="offcanvasRightEditDocVer"
                                                            >
                                                                <i className="fa-regular fa-pen-to-square me-1"></i>Edit
                                                            </span>
                                                        )}
                                                        {actions.canReqApproval && (
                                                            <span
                                                                className="badge badge-light-info fs-7 fw-bold"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRequestApproval(item);
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                <i class="bi bi-send-exclamation me-1 text-info"></i>Req-Approval
                                                            </span>
                                                        )}
                                                        {actions.canApprove && (
                                                            <span
                                                                className="badge badge-light-success fs-7 fw-bold"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleApprove(item);
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                <i className="fa-solid fa-check-double me-1"></i>Approve
                                                            </span>
                                                        )}
                                                        {actions.canReject && (
                                                            <span
                                                                className="badge badge-light-danger fs-7 fw-bold"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleReject(item);
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                <i className="fa-solid fa-ban me-1"></i>Reject
                                                            </span>
                                                        )}
                                                        {actions.canPublish && (
                                                            <span
                                                                className="badge badge-light-info fs-7 fw-bold"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handlePublish(item);
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                <i className="fa-solid fa-upload me-1"></i>Publish
                                                            </span>
                                                        )}
                                                        {actions.canDelete && isLastRecord && (
                                                            <span
                                                                className="badge badge-light-danger fs-7 fw-bold"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    item.VersionStatus !== "PUBLISHED" && handleDeleteDoc(item);
                                                                }}
                                                                style={{ cursor: "pointer" }}
                                                            >
                                                                <i class="fa-regular fa-trash-can me-1"></i>Delete Version
                                                            </span>
                                                        )}
                                                    </div>
                                                }
                                            >
                                                {/* 📱 Mobile Actions */}
                                                <div className="d-md-none mt-3">
                                                    <div className="row g-2">
                                                        <div className="col-6">
                                                            <button
                                                                className="btn btn-light-info btn-sm w-100"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleTabChange("alerts");
                                                                    setVersionId(item.Id);
                                                                    setSelectedVersionNumber(item.VersionNumber);
                                                                }}
                                                            >
                                                                <i class="bi bi-bell me-2 text-info"></i>Alerts
                                                            </button>
                                                        </div>
                                                        {actions.canViewLogs && (
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-light-primary btn-sm w-100"
                                                                    data-bs-toggle="offcanvas"
                                                                    data-bs-target="#offcanvasRightEntityLogs"
                                                                    onClick={(e) => { e.stopPropagation(); handleEntityLogs(item) }}
                                                                >
                                                                    <i className="fa-regular fa-eye"></i> Logs
                                                                </button>
                                                            </div>
                                                        )}

                                                        {actions.canPreview && (
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-light-warning btn-sm w-100"
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenPreview(item) }}
                                                                >
                                                                    <i className="fa-solid fa-expand"></i> Preview
                                                                </button>
                                                            </div>
                                                        )}

                                                        {actions.canDownload && (
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-light-dark btn-sm w-100"
                                                                    onClick={(e) => { e.stopPropagation(); handleDownloadDoc(item) }}
                                                                >
                                                                    <i className="fa-solid fa-download"></i> Download
                                                                </button>
                                                            </div>
                                                        )}

                                                        {actions.canEdit && (
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-light-primary btn-sm w-100"
                                                                    data-bs-toggle="offcanvas"
                                                                    data-bs-target="#offcanvasRightEditDocVer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditVersion(item);
                                                                    }}
                                                                >
                                                                    <i className="fa-regular fa-pen-to-square"></i> Edit
                                                                </button>
                                                            </div>
                                                        )}

                                                        {actions.canReqApproval && (
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-light-info btn-sm w-100"
                                                                    onClick={(e) => { e.stopPropagation(); handleRequestApproval(item) }}
                                                                >
                                                                    <i className="bi bi-send-exclamation text-info"></i> Req-Approval
                                                                </button>
                                                            </div>
                                                        )}

                                                        {actions.canApprove && (
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-light-success btn-sm w-100"
                                                                    onClick={(e) => { e.stopPropagation(); handleApprove(item) }}
                                                                >
                                                                    <i className="fa-solid fa-check-double"></i> Approve
                                                                </button>
                                                            </div>
                                                        )}

                                                        {actions.canReject && (
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-light-danger btn-sm w-100"
                                                                    onClick={(e) => { e.stopPropagation(); handleReject(item) }}
                                                                >
                                                                    <i className="fa-solid fa-ban"></i> Reject
                                                                </button>
                                                            </div>
                                                        )}
                                                        {actions.canPublish && (
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-light-info btn-sm w-100"
                                                                    onClick={(e) => { e.stopPropagation(); handlePublish(item) }}
                                                                >
                                                                    <i className="fa-solid fa-upload"></i>Publish
                                                                </button>
                                                            </div>
                                                        )}
                                                        {actions.canDelete && isLastRecord && (
                                                            <div className="col-6">
                                                                <button
                                                                    className="btn btn-light-danger btn-sm w-100"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        item.VersionStatus !== "PUBLISHED" && handleDeleteDoc(item);
                                                                    }
                                                                    }
                                                                >
                                                                    <i class="fa-regular fa-trash-can"></i>Delete Version
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Pannel section */}
                                                <div className={!hasOldVersionAccess ? "old-version-blur position-relative" : ""}>
                                                    {!hasOldVersionAccess && (
                                                        <div className="old-version-overlay">
                                                            <i className="fa-solid fa-lock me-2"></i>
                                                            No access to older published versions
                                                        </div>
                                                    )}

                                                    <p><i className="bi bi-chat-left-dots"></i> Comments: {item.Comments}</p>
                                                </div>
                                            </Panel>
                                        );
                                    })}
                                </Collapse>
                            </div>
                        </div>
                    )}

                    {activeTab === "alerts" && showAlertTab && docVersions.length > 0 && (
                        <div className="card tab-content animate__animated animate__fadeIn">
                            <div className="card-body p-3 p-md-4">
                                <div className="row g-3 align-items-center justify-content-between">
                                    <div className="col-12 col-md-auto">
                                        <div className="d-flex gap-2">
                                            <Select
                                                value={selectedYear}
                                                onChange={setSelectedYear}
                                                className="flex-grow-1"
                                                style={{ minWidth: 120 }}
                                            >
                                                <Option value={'0'}>All</Option>
                                                {years.map(y => (
                                                    <Option key={y} value={y}>
                                                        <div className="d-flex justify-content-between align-items-center w-100">
                                                            <span>{y}</span>
                                                            {y === currentYear && (
                                                                <span className="badge bg-primary-subtle text-primary rounded-pill fs-9 px-2">
                                                                    Current
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Option>
                                                ))}
                                            </Select>

                                            <Select
                                                value={selectedMonth}
                                                onChange={setSelectedMonth}
                                                className="flex-grow-1"
                                                style={{ minWidth: 140 }}
                                            >
                                                {months.map(m => (
                                                    <Option key={m.value} value={m.value}>
                                                        <div className="d-flex justify-content-between align-items-center w-100">
                                                            <span>{m.label}</span>
                                                            {m.value === (new Date().getMonth() + 1) && (
                                                                <span className="badge bg-primary-subtle text-primary rounded-pill fs-9 px-2">
                                                                    Current
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-auto text-md-end">
                                        <div className="d-inline-flex align-items-center gap-2 bg-light-primary text-primary rounded-pill px-3 py-2 fw-semibold shadow-sm">
                                            <i className="bi bi-file-earmark-text text-primary"></i>
                                            <span>
                                                Version: <span className="fw-bold">{selectedVersionNumber || "N/A"}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="alert-list-container px-1 mt-4 overflow-hidden"
                                    style={{ maxHeight: "30rem", overflowY: "auto" }}
                                >
                                    <div className="row g-2 m-0">
                                        {alertsLoading ? (
                                            <div className="col-12">
                                                <div className="text-center bg-white rounded-3 py-10 shadow-sm border w-100">
                                                    <div className="spinner-border text-primary mb-3" role="status">
                                                        <span className="visually-hidden">Loading...</span>
                                                    </div>
                                                    <h5 className="text-gray-600 mb-1">Loading alerts...</h5>
                                                    <p className="text-gray-400 fs-7 mb-0">Please wait while alerts are being fetched.</p>
                                                </div>
                                            </div>
                                        ) : Array.isArray(alertsList) && alertsList.length > 0 ? (
                                            alertsList.map((item, index) => {
                                                const severity = item.Severity || "LOW";
                                                const severityMeta = {
                                                    HIGH: { color: "#dc3545", bg: "#fff5f5", icon: "bi-exclamation-octagon-fill" },
                                                    MEDIUM: { color: "#fd7e14", bg: "#fffaf0", icon: "bi-exclamation-triangle-fill" },
                                                    LOW: { color: "#198754", bg: "#f0fff4", icon: "bi-info-circle-fill" },
                                                }[severity];
                                                const isInactive = item.IsActive === false;

                                                return (
                                                    <div className="col-12 col-md-6 d-flex" key={index}>
                                                        <div
                                                            className={`modern-alert-card shadow-sm border rounded-3 overflow-hidden w-100 ${isInactive ? "bg-light border-secondary-subtle opacity-75" : "bg-white"
                                                                }`}
                                                        >
                                                            <div className="d-flex flex-column flex-md-row h-100">
                                                                <div
                                                                    style={{ width: "6px", backgroundColor: isInactive ? "#adb5bd" : severityMeta.color }}
                                                                    className="d-none d-md-block"
                                                                />
                                                                <div
                                                                    style={{ height: "4px", backgroundColor: isInactive ? "#adb5bd" : severityMeta.color }}
                                                                    className="d-md-none"
                                                                />

                                                                <div className="p-3 flex-grow-1 d-flex flex-column justify-content-between">
                                                                    <div>
                                                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                                <i
                                                                                    className={`bi ${severityMeta.icon} fs-5`}
                                                                                    style={{ color: isInactive ? "#adb5bd" : severityMeta.color }}
                                                                                />
                                                                                <span
                                                                                    className={`fw-bold fs-6 text-truncate ${isInactive ? "text-muted" : "text-dark"}`}
                                                                                    title={item.AlertTitle}
                                                                                    style={{ maxWidth: "200px" }}
                                                                                >
                                                                                    {item.AlertTitle}
                                                                                </span>

                                                                                <span className={`badge fs-8 px-2 rounded-pill ${isInactive ? "bg-light text-muted border" : "border border-success-subtle text-success"}`}>
                                                                                    #{item.AutoIncNo || "N/A"}
                                                                                </span>

                                                                                <span className={`badge fs-9 capitalize ${isInactive ? "bg-light text-muted border" : "bg-info-subtle text-info-emphasis border border-info"}`}>
                                                                                    <i className="bi bi-arrow-repeat me-1"></i>
                                                                                    {item.OcurrenceTypeNames || "N/A"}
                                                                                </span>

                                                                                {item.IsMaintenance === true && (
                                                                                    <span className="badge bg-light-warning text-warning border border-warning-subtle fs-9 rounded-pill">
                                                                                        <i className="bi bi-tools me-1 text-warning me-1"></i>
                                                                                        Maintenance Alert
                                                                                    </span>
                                                                                )}

                                                                                {isInactive && (
                                                                                    <span className="badge bg-secondary text-white fs-9 rounded-pill">
                                                                                        Inactive
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <div className="d-flex gap-1 ms-2">
                                                                                <button
                                                                                    className="btn btn-icon btn-light-primary btn-sm"
                                                                                    onClick={() => handleAlertClick(item)}
                                                                                    title="View"
                                                                                >
                                                                                    <i className="bi bi-eye"></i>
                                                                                </button>

                                                                                <button
                                                                                    className="btn btn-icon btn-light-danger btn-sm"
                                                                                    disabled={true}
                                                                                    title="Delete is disabled for inactive alerts"
                                                                                >
                                                                                    <i className="bi bi-trash3"></i>
                                                                                </button>
                                                                            </div>
                                                                        </div>

                                                                        <div className={`fs-7 lh-base border-top pt-2 mt-1 ${isInactive ? "text-muted" : "text-gray-600"}`}>
                                                                            <i className={`bi bi-chat-dots me-1 ${isInactive ? "text-muted" : "text-primary"}`}></i>
                                                                            {item.Message || "No description available"}
                                                                        </div>
                                                                    </div>


                                                                    <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top border-dashed text-muted fs-8">
                                                                        <div className="d-flex align-items-center text-truncate ms-1">
                                                                            <i className={`bi bi-person-circle me-1 ${isInactive ? "text-muted" : "text-primary"}`}></i>
                                                                            <span className="text-truncate">
                                                                                By: <span className={isInactive ? "text-muted fw-medium" : "text-dark fw-medium"}>{item.Name || "System"}</span>
                                                                            </span>
                                                                        </div>

                                                                        <div className="vr" style={{ height: "12px" }}></div>

                                                                        <div className="d-flex align-items-center">
                                                                            <i className={`bi bi-calendar-event me-1 ${isInactive ? "text-muted" : "text-primary"}`}></i>
                                                                            <span>{formatToDDMMYYYY(item.CreatedOn) || "N/A"}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="col-12">
                                                <div className="text-center bg-white rounded-3 py-10 shadow-sm border w-100">
                                                    <i className="bi bi-bell-slash fs-1 text-gray-300 d-block mb-3"></i>
                                                    <h5 className="text-gray-500">No active alerts found</h5>
                                                    <p className="text-gray-400 fs-7">Try adjusting your filters or add a new alert.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>
                {`
                .swal-publish-popup {
                    padding-top: 0.75rem !important;
                    padding-bottom: 1rem !important;
                }

                .swal-publish-title {
                    font-size: 22px !important;
                    margin: 0.25rem 0 0.5rem !important;
                    line-height: 1.2 !important;
                    padding: 0 !important;
                }

                .old-version-blur {
                    filter: blur(2px);
                    opacity: 0.65;
                    pointer-events: none;
                    user-select: none;
                }

                .old-version-overlay {
                    position: absolute;
                    inset: 0;
                    z-index: 5;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.45);
                    backdrop-filter: blur(1px);
                    color: #d63384;
                    font-weight: 700;
                    font-size: 14px;
                    pointer-events: none;
                }

                .tab-item {
                display: flex;
                align-items: center;
                padding: 10px 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #6c757d;
                }

                .tab-item i {
                transition: transform 0.3s ease, color 0.3s ease;
                font-size: 1.1rem;
                }

                /* Active State Styles */
                .tab-item.active {
                color: #0d6efd; /* Brand Blue */
                font-weight: 600;
                border-bottom: 2px solid #0d6efd;
                }

                .tab-item.active i {
                transform: translateY(-2px); /* Subtle lift */
                color: #0d6efd;
                text-shadow: 0px 0px 8px rgba(13, 110, 253, 0.4); /* Soft glow */
                }

                /* Hover effect for life */
                .tab-item:hover i {
                transform: scale(1.1);
                }
                .page-loading-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .loading-content {
                    text-align: center;
                    font-weight: 600;
                    color: #3f4254;
                }

                .spinning {
                    font-size: 2.5rem;
                    animation: spin 1s linear infinite;
                    color: #0d6efd;
                }

                @keyframes spin {
                    100% {
                        transform: rotate(360deg);
                    }
                }

               .swal-approve-wide {
                    width: 550px !important;      /* wider popup */
                    max-width: 95% !important;

                    min-height: 420px !important; /* 👈 increase height */
                    padding: 25px !important;     /* more breathing space */

                    overflow: visible !important; /* prevent scroll */
                }
                .swal2-popup {
                    max-height: 100vh !important;  /* fits screen */
                }
                /* Active Menu Link Styling */
                .menu-link.active {
                    background-color: #f1faff !important; /* Light blue tint */
                    border-bottom: 2px solid #0095ff !important;
                }

                .menu-link {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.75rem 1.25rem;
                    border-radius: 10px;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }

                .menu-link:hover {
                    background-color: #f9fafb !important;
                    transform: translateY(-1px);
                }

                /* Ant Design Dropdown Customization */
                .ant-dropdown-menu {
                    min-width: 180px !important;
                    padding: 8px !important;
                }

                .ant-dropdown-menu-item:hover {
                    background-color: #f1faff !important;
                    border-radius: 6px;
                }
                /* Prevent the merging effect by adding white space and subtle transitions */
                .modern-alert-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    border: 1px solid #ebedf3 !important;
                }

                .modern-alert-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
                }

                /* Specific styling for small buttons used in the list */
                .btn-icon {
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                }

                /* Custom scrollbar for a cleaner look */
                .alert-list-container {
                    overflow-x: hidden !important; /* Force hide horizontal scroll */
                }

                /* Optional: Make the vertical scrollbar look cleaner */
                .alert-list-container::-webkit-scrollbar {
                    width: 6px;
                }
                .alert-list-container::-webkit-scrollbar-thumb {
                    background-color: #e0e0e0;
                    border-radius: 10px;
                }
                /* Mobile specific font tweaks */
                @media (max-width: 768px) {
                    .fs-9 { font-size: 0.7rem !important; }
                    .btn-sm { padding: 0.4rem 0.6rem; }
                }
                                @keyframes pulse-slow {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                    100% { opacity: 1; transform: scale(1); }
                }

                .animate-pulse-slow {
                    animation: pulse-slow 3s infinite ease-in-out;
                    cursor: help;
                }

                .tab-item {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    padding: 8px 12px;
                    transition: all 0.3s ease;
                }

                .tab-item.active {
                    border-bottom: 2px solid #0066cc;
                    color: #0066cc;
                    font-weight: bold;
                }
                                @keyframes professional-pulse {
                    0% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(37, 117, 252, 0.7);
                    }
                    70% {
                        transform: scale(1.05);
                        box-shadow: 0 0 0 10px rgba(37, 117, 252, 0);
                    }
                    100% {
                        transform: scale(1);
                        box-shadow: 0 0 0 0 rgba(37, 117, 252, 0);
                    }
                }

                .blink-pulse {
                    animation: professional-pulse 2s infinite;
                    display: inline-block; /* Required for transform to work */
                }
                                /* Backdrop */
                .preview-modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.45);
                    z-index: 1055;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* Modal */
                .preview-modal {
                    width: 95%;
                    max-width: 1200px;
                    background: #fff;
                    border-radius: 10px;
                    box-shadow: 0 25px 60px rgba(0,0,0,0.25);
                    overflow: hidden;
                }

                /* Preview body */
                .preview-container {
                    height: 80vh;
                    padding: 1rem;
                    background: #f5f7fa;
                }

                /* iframe / media */
                .preview-container iframe,
                .preview-container img,
                .preview-container video,
                .preview-container pre {
                    width: 100%;
                    height: 100%;
                    border-radius: 8px;
                    background: #fff;
                }

                /* Animation */
                .animate-scale-in {
                    animation: scaleIn 0.25s ease;
                }

                @keyframes scaleIn {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                  .mobileMarginTop {
                            width: 100%;
                            margin-top: 25px;
                        }
                        button[data-bs-toggle="offcanvas"] {
                            position: relative;
                            z-index: 10; /* bring it above overlays */
                        }

                        .active-module .dropdown-item {
                            background-color: rgba(13, 110, 253, 0.1);
                            font-weight: 600;
                            border-radius: 4px;
                            transition: all 0.3s ease;
                        }

                        .active-module .dropdown-item span {
                            color: #0d6efd;
                        }
                        @media (min-width: 768px) { /* Medium devices and up (md) */
                            #offcanvasRightMOM {
                                width: 45% !important;
                            }


                            .mobileMarginTop {
                                width: 23%
                            }
                        }
                        .dropdown:hover .dropdown-menu {
                            display: block;
                        }
                        .module-item {
                            transition: background-color 0.3s ease, transform 0.2s ease;
                            border-radius: 6px;
                            padding: 8px 12px;
                        }

                        /* Hover animation */
                        .module-item:hover {
                            background-color: #f1f5f9; /* soft gray */
                            transform: scale(1.03);   /* subtle zoom instead of shift */
                            color: #0d6efd;           /* highlight text */
                        }

                        /* Make icon animate separately */
                        .module-item i {
                            transition: transform 0.3s ease;
                        }

                        .module-item:hover i {
                            transform: rotate(10deg) scale(1.2); /* playful hover effect */
                        }
                .tab-content {
                        animation: fadeSlide 0.3s ease-in-out;
                    }

                    @keyframes fadeSlide {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                        .tab-header {
                        border-bottom: 1px solid #e9ecef;
                    }

                    .tab-item {
                        position: relative;
                        padding: 8px 14px;
                        font-weight: 600;
                        color: #6c757d;
                        cursor: pointer;
                        transition: color 0.25s ease;
                    }

                    /* underline animation */
                    .tab-item::after {
                        content: "";
                        position: absolute;
                        left: 0;
                        bottom: -1px;
                        width: 0%;
                        height: 3px;
                        background-color: #0dcaf0; /* bootstrap info */
                        transition: width 0.3s ease;
                    }

                    .tab-item:hover {
                        color: #0dcaf0;
                    }

                    .tab-item.active {
                        color: #0dcaf0;
                    }

                    /* animate underline */
                    .tab-item.active::after {
                        width: 100%;
                    }
                    .tab-item:active {
                        transform: scale(0.97);
                    }
                    `}
            </style>

            <UplaodDocument />
            <EditDocVersion editObj={editVersionData} />
            <EntityLogs entityObj={entityItem} />
            <AddDocVersion docObj={docItem} />
            <ViewAlert alertObj={selectedAlert} />
            <AddAlert machineId={docId} versionId={docVersions[0]?.Id} deptId={docDetails?.DeptId} entityType="Documents" />
            <RegisterMasterTypes typeCategory={3} />
            <DocumentPreview
                isOpen={previewModal.show}
                onClose={() => setPreviewModal({ show: false, item: null })}
                filePath={previewModal.item?.FilePath}
                docName={docDetails?.DocName}
                itemData={previewModal.item} // For logging
                sessionUserData={sessionUserData}
            />
        </Base1>
    )
}