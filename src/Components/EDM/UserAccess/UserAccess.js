
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Base1 from "../../Config/Base1";
import { fetchWithAuth } from "../../../utils/api";
import { Tooltip, message } from 'antd';
import RegisterMasterTypes from "../../Config/MasterTypes";

export default function UserAccessDoc() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedUser, setSelectedUser] = useState([]); // Default to first user
    const [docTypes, setDocTypes] = useState([]);
    const [docTypesLoading, setDocTypesLoading] = useState(false);
    const [docPermisLoading, setDocPermisLoading] = useState(false);
    const [userDocPermissions, setUserDocPermissions] = useState([]);
    const [originalPermissions, setOriginalPermissions] = useState([]);
    const [userDocPermsSaveLoading, setUserDocPermsSaveLoading] = useState(false);
    const [docSearchQuery, setDocSearchQuery] = useState("");

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
            setSessionModuleId(moduleId);
        } else {
            navigate("/");
        }
    }, []);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            // setMenuData(parsedMenu)

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Manage Access"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDDLData();
            fetchMasterTypes();
        }
    }, [sessionUserData?.OrgId]);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlDocUserAccessData");
            let users = [];

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);
                users = parsed.users || [];

                setUsersData(users);
            } else {
                const response = await fetchWithAuth(
                    `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    }
                );

                if (!response.ok) throw new Error("Network response was not ok");

                const data = await response.json();

                users = data.ResultData.filter((item) => item.DDLName === "Users");

                setUsersData(users);

                sessionStorage.setItem(
                    "ddlDocUserAccessData",
                    JSON.stringify({ users: users })
                );
            }
        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUsersData([]);
        }
    };

    const fetchMasterTypes = async () => {
        setDocTypesLoading(true);
        try {
            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=0&ModuleId=${sessionModuleId}&TypeCategory=2`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setDocTypes(data.ResultData || []);
            setDocTypesLoading(false);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDocTypes([]);
            setDocTypesLoading(false);
        }
    };

    const fetchUserDocPermissions = async () => {
        setDocPermisLoading(true);
        try {
            const response = await fetchWithAuth(
                `EDM/GetUserDocTypePermissions?OrgId=${sessionUserData?.OrgId}&UserId=${selectedUser?.ItemId}&MasterTypeId=0&Type=DocTypes`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setUserDocPermissions(data.ResultData || []);
            setOriginalPermissions(data.ResultData || []);
            setDocPermisLoading(false);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUserDocPermissions([]);
            setDocPermisLoading(false);
        }
    };

    // Function to handle checkbox toggles
    const handlePermissionChange = (masterTypeId, field, value) => {
        setUserDocPermissions(prev => {
            // Find if we already have an entry for this type
            const existingIdx = prev.findIndex(p => p.MasterTypeId === masterTypeId);

            if (existingIdx > -1) {
                const updated = [...prev];
                updated[existingIdx] = { ...updated[existingIdx], [field]: value };
                return updated;
            } else {
                // If not found, create a new object with defaults
                return [...prev, {
                    MasterTypeId: masterTypeId,
                    CanRead: field === 'CanRead' ? value : false,
                    CanWrite: field === 'CanWrite' ? value : false
                }];
            }
        });
    };

    const onSavePermissions = async () => {
        setUserDocPermsSaveLoading(true);
        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: selectedUser?.ItemId,
            CreatedBy: sessionUserData?.Id,
            JsonData: userDocPermissions.map(p => ({
                MasterTypeId: p.MasterTypeId,
                CanRead: !!p.CanRead,
                CanWrite: !!p.CanWrite,
                CanPublish: !!p.CanPublish,
            }))
        };

        try {
            const response = await fetchWithAuth(`EDM/SaveUserDocPermissions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            const serverResponse = result?.data?.result?.[0];

            if (response.ok && serverResponse?.ResponseCode === 2001) {
                message.success(serverResponse?.ResponseMessage || "Updated successfully");
                fetchUserDocPermissions();
                setUserDocPermsSaveLoading(false);
            } else {
                message.error(serverResponse?.ResponseMessage || "Failed to save permissions");
                setUserDocPermsSaveLoading(false);
            }
        } catch (error) {
            console.error("Error saving permissions:", error);
            setUserDocPermsSaveLoading(false);
            message.error("An internal error occurred while saving.");
        }
    };

    useEffect(() => {
        if (selectedUser.ItemId) {
            fetchUserDocPermissions();
        }
    }, [selectedUser]);

    const filteredUsers = usersData?.filter((user) => {
        const name = user.ItemValue?.toLowerCase() || "";
        const email = user.DisplayValue?.toLowerCase() || "";
        const dept = user.DisplayValue2?.toLowerCase() || "";
        const query = searchQuery.toLowerCase();

        return name.includes(query) || email.includes(query) || dept.includes(query);
    });

    const filteredDocTypes = (docTypes || []).filter(type =>
        type?.TypeName?.toLowerCase().includes(docSearchQuery.toLowerCase())
    );

    const getTooltipText = (perm) => {
        switch (perm) {
            case 'R': return 'Read Access';
            case 'W': return 'Write Access';
            case 'P': return 'Publish Access';
            default: return '';
        }
    }

    const handleDiscard = (e) => {
        // 1. Remove focus from button
        if (e) e.currentTarget.blur();

        // 2. Clear Search inputs
        setSearchQuery("");
        setDocSearchQuery("");

        // 3. Reset Permissions to original state
        // 'originalPermissions' should be the state where you stored the initial API response
        if (originalPermissions) {
            setUserDocPermissions([...originalPermissions]);
        }

        message.success('Changes discarded and filters cleared');
    };

    const showTypeBtn = sessionActionIds?.includes(18);
    const isNoUserSelected = selectedUser.length === 0;

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar pt-3 pt-lg-6 mb-5">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bolder fs-3 flex-column justify-content-center my-0">Access Control Management</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href="/edm/edm-dashboard" className="text-muted text-hover-primary">Dashboard</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-gray-900">Permissions</li>
                        </ul>
                    </div>
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        <Link to="/edm/documents" className="btn btn-sm fw-bold btn-light-dark d-flex align-items-center px-4 shadow border border-dark">
                            <i className="fa-solid fa-arrow-left fs-9 mt-1"></i>
                            Back to Documents
                        </Link>
                    </div>

                </div>
            </div>

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2 mb-10">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card shadow-sm border-0 overflow-hidden">
                        <div className="card-header bg-white py-4 border-bottom d-flex align-items-center justify-content-between">
                            <div className="card-title flex-column">
                                <h3 className="fw-bolder text-gray-800 fs-4 mb-0">Permission Management</h3>
                                <span className="text-muted fs-7 fw-bold mt-1">
                                    Configuring permissions for: <span className="text-primary">{selectedUser.ItemValue} - {selectedUser.DisplayValue}</span>
                                </span>
                            </div>

                            <div className="d-flex align-items-center">
                                <Tooltip
                                    placement="bottomRight"
                                    overlayClassName="custom-permission-tooltip"
                                    overlayInnerStyle={{
                                        width: '320px',
                                        backgroundColor: '#1e1e2d',
                                        borderRadius: '12px',
                                        padding: '15px',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                                    }}
                                    title={
                                        <div className="permission-guide">
                                            <div className="d-flex align-items-center mb-4 border-bottom border-white border-opacity-10 pb-3">
                                                <i className="fa-solid fa-shield-halved text-primary me-2 fs-5"></i>
                                                <h6 className="text-white fw-bolder mb-0 fs-7">Access Level Guide</h6>
                                            </div>

                                            <div className="d-flex flex-column gap-4">
                                                <div className="d-flex align-items-start">
                                                    <div className="symbol symbol-30px me-3">
                                                        <span className="symbol-label bg-light-primary text-primary fw-boldest">R</span>
                                                    </div>
                                                    <div className="d-flex flex-column">
                                                        <span className="text-white fw-bold fs-8">Read Access</span>
                                                        <span className="text-gray-500 fs-9">Allows viewing and downloading documents.</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-start">
                                                    <div className="symbol symbol-30px me-3">
                                                        <span className="symbol-label bg-light-success text-success fw-boldest">W</span>
                                                    </div>
                                                    <div className="d-flex flex-column">
                                                        <span className="text-white fw-bold fs-8">Write Access</span>
                                                        <span className="text-gray-500 fs-9">Allows creating new versions and editing metadata.</span>
                                                    </div>
                                                </div>

                                                <div className="d-flex align-items-start">
                                                    <div className="symbol symbol-30px me-3">
                                                        <span className="symbol-label bg-light-warning text-warning fw-boldest">P</span>
                                                    </div>
                                                    <div className="d-flex flex-column">
                                                        <span className="text-white fw-bold fs-8">Publish Access</span>
                                                        <span className="text-gray-500 fs-9">Grant authority to finalize and go live.</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                >
                                    <div className="btn btn-icon btn-sm btn-light-primary pulse pulse-primary me-3 rounded-circle shadow-sm border border-secondary">
                                        <i className="fa-solid fa-circle-question fs-5 fa-fade"></i>
                                        <span className="pulse-ring"></span>
                                    </div>
                                </Tooltip>

                                <button className="btn btn-sm btn-light-danger fw-bold me-3" onClick={handleDiscard}
                                    disabled={isNoUserSelected || docPermisLoading || userDocPermsSaveLoading}
                                >
                                    <i className="fa-solid fa-rotate-left me-2"></i> Discard
                                </button>
                                <button
                                    className="btn btn-sm btn-primary px-8 fw-bolder shadow-sm d-flex align-items-center"
                                    onClick={onSavePermissions}
                                    disabled={isNoUserSelected || docPermisLoading || userDocPermsSaveLoading}
                                >
                                    <i className="fa-solid fa-floppy-disk me-2 fs-7"></i>
                                    Save Changes for {selectedUser.ItemValue}
                                </button>
                            </div>
                        </div>

                        <div className="card-body p-0">
                            <div className="row g-0">
                                <div className="col-2 border-end bg-light-soft d-flex flex-column" style={{ height: '455px' }}>
                                    <div className="p-4 bg-light border-bottom sticky-top" style={{ zIndex: 2 }}>
                                        <span className="fw-bolder text-muted text-uppercase fs-8 ls-1 d-block mb-3">User Directory</span>
                                        <div className="position-relative">
                                            <i className="bi bi-person position-absolute top-50 start-0 translate-middle-y ms-3 text-gray-500"></i>
                                            <div className="position-relative mb-2">
                                                <i className="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>

                                                <input
                                                    type="text"
                                                    className="form-control form-control-solid form-control-sm ps-10 pe-10 fs-7 bg-secondary"
                                                    placeholder="Search user..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    autoComplete="off"
                                                    spellCheck="false"
                                                />

                                                {searchQuery && (
                                                    <button
                                                        className="btn btn-flush position-absolute top-50 end-0 translate-middle-y me-2 p-0 border-0 bg-transparent"
                                                        onClick={() => setSearchQuery("")}
                                                        type="button"
                                                    >
                                                        <i className="bi bi-x-circle-fill text-muted fs-7"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="list-group list-group-flush overflow-auto flex-grow-1">
                                        {filteredUsers?.map((user, idx) => (
                                            <div
                                                key={user.ItemId || idx}
                                                onClick={() => setSelectedUser(user)}
                                                className={`list-group-item list-group-item-action py-4 px-5 border-bottom border-gray-100 cursor-pointer transition-3ms ${selectedUser.ItemId === user.ItemId ? 'bg-light-primary border-end border-end-3 border-primary' : ''}`}
                                            >
                                                <div className="d-flex align-items-center">
                                                    <div className={`d-flex align-items-center justify-content-center rounded-circle me-3 shadow-sm flex-shrink-0 ${selectedUser.ItemId === user.ItemId ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'}`}
                                                        style={{ width: '38px', height: '38px', minWidth: '38px' }}>
                                                        <span className="fs-7 fw-bolder">{(user.ItemValue || "?").charAt(0)}</span>
                                                    </div>
                                                    <div className="d-flex flex-column overflow-hidden">
                                                        <span className={`fs-7 fw-bolder text-truncate ${selectedUser.ItemId === user.ItemId ? 'text-primary' : 'text-gray-800'}`}>{user.ItemValue}</span>
                                                        <span className="text-muted fs-8 fw-bold text-truncate">{user.DisplayValue}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-10 d-flex flex-column" style={{ height: '455px' }}>
                                    <div className="p-4 bg-light border-bottom sticky-top d-flex align-items-center justify-content-between" style={{ zIndex: 2 }}>
                                        <span className="fw-bolder text-muted text-uppercase fs-8 ls-1">Doc-Types & Permissions</span>

                                        <div className="position-relative w-300px">
                                            <i className="bi bi-filter position-absolute top-50 start-0 translate-middle-y ms-3 text-gray-500"></i>
                                            <div className="position-relative">
                                                <i className="bi bi-filter position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"></i>

                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm form-control-solid ps-10 pe-10 fs-7 bg-secondary"
                                                    placeholder="Filter document types..."
                                                    value={docSearchQuery}
                                                    onChange={(e) => setDocSearchQuery(e.target.value)}
                                                    autoComplete="off"
                                                />

                                                {docSearchQuery && (
                                                    <button
                                                        className="btn btn-flush position-absolute top-50 end-0 translate-middle-y me-2 p-0 border-0 bg-transparent"
                                                        onClick={() => setDocSearchQuery("")}
                                                        type="button"
                                                    >
                                                        <i className="bi bi-x-circle-fill text-muted fs-7"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 overflow-auto flex-grow-1">
                                        {(docPermisLoading || docTypesLoading) && (
                                            <div
                                                className="position-absolute w-100 h-100 top-0 start-0 d-flex align-items-center justify-content-center"
                                                style={{
                                                    zIndex: 10,
                                                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                                                    backdropFilter: 'blur(4px)',
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <div className="text-center">
                                                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                                                        <span className="visually-hidden">Loading...</span>
                                                    </div>
                                                    <div className="text-gray-600 fw-bold mt-3">Fetching Permissions...</div>
                                                </div>
                                            </div>
                                        )}
                                        {isNoUserSelected ? (
        /* --- SHOW THIS ONLY WHEN NO USER IS SELECTED --- */
        /* We use d-flex h-100 to center it perfectly in the viewable area */
        <div className="h-100 d-flex flex-column align-items-center justify-content-center animate__animated animate__fadeIn">
            <div className="text-center">
                <div className="mb-4 opacity-20">
                    <i className="fa-solid fa-users-gear" style={{ fontSize: '5rem' }}></i>
                </div>
                <div className="badge badge-light-danger fs-6 p-4 shadow-sm border border-danger rounded-pill">
                    <i className="fa-solid fa-user-slash me-2"></i>
                    Please select a user to manage permissions
                </div>
                <p className="text-gray-500 mt-3 fs-7">
                    Select a team member from the left sidebar to begin.
                </p>
            </div>
        </div>
    ) : filteredDocTypes.length === 0 ? (
        <div className="col-12 text-center py-5 my-5">
        <div className="card shadow-none border-0 bg-light-primary p-5 rounded-4 d-inline-block w-100 max-w-500px">
            <div className="card-body">
                <div className="mb-4">
                    <div className="d-inline-flex align-items-center justify-content-center bg-white rounded-circle shadow-sm" style={{ width: '80px', height: '80px' }}>
                        <i className="fa-solid fa-file-circle-plus text-primary fs-1"></i>
                    </div>
                </div>

                <h3 className="fw-bolder text-dark mb-2">No Document Types Found</h3>
                <p className="text-gray-600 fs-7 mb-5">
                    Your document type list is currently empty. <br />
                    Start by adding your first type to manage permissions effectively.
                </p>

                <button
                    className="btn btn-primary px-8 py-3 shadow-lg border-0 hover-elevate-up transition-3ms"
                    style={{
                        background: 'linear-gradient(90deg, #0095E8 0%, #006AE6 100%)',
                        borderRadius: '12px',
                        fontWeight: '600',
                        letterSpacing: '0.5px'
                    }}
                    data-bs-toggle="offcanvas"
                    data-bs-target="#offcanvasRightAddMasterTypes"
                    disabled={!showTypeBtn}
                >
                    <span className="d-flex align-items-center">
                        <div className="bg-white bg-opacity-20 rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px' }}>
                            <i className="fa-solid fa-plus text-white fs-9"></i>
                        </div>
                        CREATE NEW DOCUMENT TYPE
                    </span>
                </button>
            </div>
        </div>
    </div>
    ) : (

                                        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4 transition-3ms"
                                            style={{
                                                filter: isNoUserSelected ? 'blur(2px)' : 'none',
                                                pointerEvents: isNoUserSelected || docPermisLoading ? 'none' : 'auto',
                                                opacity: isNoUserSelected ? 0.6 : 1
                                            }}>
                                            {filteredDocTypes.map((type, dIdx) => {
                                                const permission = userDocPermissions?.find(p => p.MasterTypeId === type.Id);

                                                return (
                                                    <div className="col" key={type.Id || dIdx}>
                                                        <div className="card h-100 border border-gray-200 shadow-none hover-shadow-sm transition-3ms">
                                                            <div className="card-body p-4">
                                                                <div className="mb-4">
                                                                    <Tooltip title={type.TypeName} placement="topLeft" arrow color="#0095E8">
                                                                        <span className="fw-bolder text-gray-700 fs-7 d-block text-truncate text-uppercase cursor-help">
                                                                            <i className="fa-solid fa-file-lines me-2 text-gray-400 fs-9"></i>
                                                                            {type.TypeName}
                                                                        </span>
                                                                    </Tooltip>
                                                                </div>

                                                                {/* Permission Toggles Row */}
                                                                <div className="d-flex justify-content-between align-items-center bg-light rounded px-2 py-3">
                                                                    {[
                                                                        { key: 'R', icon: 'fa-eye', field: 'CanRead' },
                                                                        { key: 'W', icon: 'fa-pen-to-square', field: 'CanWrite' },
                                                                        { key: 'P', icon: 'fa-upload', field: 'CanPublish' }, // 👈 Changed from F to P
                                                                    ].map((perm) => {
                                                                        let isChecked = false;
                                                                        if (perm.key === 'R') isChecked = !!permission?.CanRead;
                                                                        if (perm.key === 'W') isChecked = !!permission?.CanWrite;
                                                                        if (perm.key === 'P') isChecked = !!permission?.CanPublish; // 👈 Check specific field

                                                                        return (
                                                                            <div key={perm.key} className="text-center">
                                                                                <div className="fs-7 fw-bolder text-uppercase mb-2 d-flex align-items-center justify-content-center text-primary">
                                                                                    <i className={`fa-solid ${perm.icon} me-1 fs-9 opacity-75`}></i>
                                                                                    {perm.key}
                                                                                </div>

                                                                                <div className="form-check form-check-custom justify-content-center bg-transparent">
                                                                                    <Tooltip title={getTooltipText(perm.key)} placement="top">
                                                                                        <input
                                                                                            className="form-check-input h-20px w-20px cursor-pointer custom-primary-check"
                                                                                            type="checkbox"
                                                                                            style={{ backgroundColor: 'transparent', borderWidth: '2px' }}
                                                                                            checked={isChecked}
                                                                                            onChange={(e) => {
                                                                                                const checked = e.target.checked;

                                                                                                if (perm.key === 'R') {
                                                                                                    handlePermissionChange(type.Id, 'CanRead', checked);
                                                                                                    // If Read is OFF, Kill everything else
                                                                                                    if (!checked) {
                                                                                                        handlePermissionChange(type.Id, 'CanWrite', false);
                                                                                                        handlePermissionChange(type.Id, 'CanPublish', false);
                                                                                                    }
                                                                                                }
                                                                                                else if (perm.key === 'W') {
                                                                                                    handlePermissionChange(type.Id, 'CanWrite', checked);
                                                                                                    // If Write is ON, force Read ON
                                                                                                    if (checked && !permission?.CanRead) {
                                                                                                        handlePermissionChange(type.Id, 'CanRead', true);
                                                                                                    }
                                                                                                }
                                                                                                else if (perm.key === 'P') {
                                                                                                    // --- PUBLISH TOGGLE ---
                                                                                                    handlePermissionChange(type.Id, 'CanPublish', checked);

                                                                                                    // ✅ If user chooses P, enable R automatically
                                                                                                    if (checked && !permission?.CanRead) {
                                                                                                        handlePermissionChange(type.Id, 'CanRead', true);
                                                                                                    }
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                    </Tooltip>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        
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
                .custom-permission-tooltip .ant-tooltip-arrow::before {
                    background-color: #1e1e2d !important;
                }
               /* Custom Danger Checkbox for 'N' */
                   /* Base transparent state */
                    .form-check-input {
                        background-color: transparent !important;
                        border: 2px solid #d1d3e0 !important; /* Soft gray border for unchecked state */
                    }

                    /* Primary Checkboxes (R, W, F) when checked */
                    .custom-primary-check:checked {
                        background-color: #0095E8 !important; /* Your primary blue */
                        border-color: #0095E8 !important;
                        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3e%3cpath fill='none' stroke='%23fff' stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M6 10l3 3l6-6'/%3e%3c/svg%3e") !important;
                    }

                    .bg-light-soft { background-color: #fcfcfd; }
                    
                    .hover-border-primary:hover {
                        border-color: #009ef7 !important;
                        background-color: #f1faff !important;
                        transform: translateY(-2px);
                    }

                    .custom-sidebar-scroll::-webkit-scrollbar,
                    .custom-grid-scroll::-webkit-scrollbar {
                        width: 5px;
                        height: 5px;
                    }

                    .custom-sidebar-scroll::-webkit-scrollbar-thumb,
                    .custom-grid-scroll::-webkit-scrollbar-thumb {
                        background: #e1e3ea;
                        border-radius: 10px;
                    }

                    .shadow-xs {
                        box-shadow: 0 .125rem .25rem rgba(0,0,0,.03) !important;
                    }

                    .transition-3ms {
                        transition: all 0.2s ease-in-out;
                    }
                `}
            </style>

            <RegisterMasterTypes typeCategory={2} />
        </Base1>
    )
}