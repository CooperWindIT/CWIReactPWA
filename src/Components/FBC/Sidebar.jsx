

import React, { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
  UserOutlined,
  CalendarOutlined,
  ShareAltOutlined,
  TeamOutlined,
  EyeOutlined,
} from "@ant-design/icons";

import {
  Button,
  Select,
  Tooltip,
  Modal,
  Space,
  Tag,
  Card,
  Avatar,
  Popconfirm,
  Spin,
  Empty,
  message,
  Checkbox,
} from "antd";

import { exportDiagramAsPdf } from './hooks/pdfUtils';   // ✅ import
import { fetchWithAuth } from '../../utils/api';
import AddDocVersion from './../EDM/Documents/AddVersion';
import EditDocVersion from './../EDM/Documents/EditVersion';
import LZString from "lz-string";


const { Option } = Select;
const FILL_COLORS = ['transparent', '#fdeaea', '#d3f9d8', '#d0ebff', '#fff3bf', '#e5dbff'];

const TABS = [
  { id: 'mine', label: 'My Drafts' },
  { id: 'shared', label: 'Shared Drafts' },
  { id: 'documents', label: 'EDM Documents' },
];


function fmt(ts) {
  const date = new Date(ts);
  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

// Assumption: files without a `shared` flag and without type === 'document'
// are treated as "My Drafts". Adjust this predicate once your file objects
// carry real ownership/sharing/document metadata.
function getFileTab(file) {
  if (file.type === "document") return "documents";
  if (file.shared) return "shared";
  return "mine";
}

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </svg>
);

const FolderIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

const DocIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

export default function Sidebar({
  open,
  onToggle,
  files,
  currentFileId,
  onNewFile,
  onLoadFile,
  onDeleteFile,
  onGetFileData,
  theme,
  onThemeChange,
  showGrid,
  handleGridToggle,
  autoArrowEnabled,
  onToggleAutoArrow,
  onChangeCanvasBg,
  onUploadToEdm,
  draftFiles,

  fetchSharedDrafts,
  sharedDraftFiles,

  edmDocuments,
  fetchEDMDocuments,
  onLoadDocument,
  onStartVersion,
  onStartEditVersion,
  onViewVersion,
  versionJson,
  onSharedPermission,
}) {

  const [exportMenuFileId, setExportMenuFileId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('mine');
  const [docTypeFilter, setDocTypeFilter] = useState(null);
  const [docTypeOptions, setDocTypeOptions] = useState([]);
  const [uploadedByOptions, setUploadedByOptions] = useState([]);
  const [sessionUserData, setsessionUserData] = useState({});
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [manageShareModal, setManageShareModal] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [removedUsers, setRemovedUsers] = useState([]);
  const [loadingSharedUsers, setLoadingSharedUsers] = useState(false);
  const [saving, setSaving] = useState(null);
  // const [isVersionMode, setIsVersionMode] = useState(false);
  // const [isVersionEditMode, setIsVersionEditMode] = useState(false);


  const visibleDrafts = draftFiles;
  const visibleSharedDrafts = sharedDraftFiles;
  const visibleDocuments = edmDocuments;

  const handleDownloadLocal = async (file) => {
    setExporting(true);
    setExportMenuFileId(null);
    try {
      // Get latest nodes+connections for this file
      const data = onGetFileData(file.id);
      const doc = await exportDiagramAsPdf({
        name: file.name || 'diagram',
        nodes: data?.nodes || file.nodes || [],
        connections: data?.connections || file.connections || [],
      });
      doc.save(`${file.name || 'diagram'}.pdf`);
    } catch (e) {
      console.error('Export failed:', e);
    }
    setExporting(false);
  };

  useEffect(() => {
    const userDataString = sessionStorage.getItem("userData");
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      setsessionUserData(userData);
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const sessionDDL = sessionStorage.getItem("ddlDocumentFilters");

      if (sessionDDL) {
        const parsed = JSON.parse(sessionDDL);
        setUploadedByOptions(parsed.users || []);
        return;
      }

      const response = await fetchWithAuth(
        `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      const users = data.ResultData.filter(
        (item) => item.DDLName === "Users"
      );

      setUploadedByOptions(users);

      sessionStorage.setItem(
        "ddlDocumentFilters",
        JSON.stringify({
          users,
        })
      );
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUploadedByOptions([]);
    }
  };

  const fetchContentTypes = async () => {
    try {
      const response = await fetchWithAuth(
        `EDM/GetUserDocTypePermissions?OrgId=${sessionUserData?.OrgId}&UserId=${sessionUserData?.Id}&MasterTypeId=0&Type=DocTypes`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      const flowChartTypes = (data?.ResultData || []).filter(
        (item) => item.IsFlowChart === true
      );

      setDocTypeOptions(flowChartTypes);
      setDocTypeFilter(flowChartTypes[0].MasterTypeId)

    } catch (error) {
      console.error("Failed to fetch document types:", error);
      setDocTypeOptions([]);
    }
  };

  useEffect(() => {
    if (sessionUserData?.OrgId && sessionUserData?.Id) {
      fetchUsers();
      fetchContentTypes();
    }
  }, [sessionUserData]);

  useEffect(() => {
    fetchEDMDocuments(
      docTypeFilter === "All types" ? 0 : docTypeFilter
    );
  }, [docTypeFilter, fetchEDMDocuments]);

  useEffect(() => {
    if (activeTab === "shared") {
      fetchSharedDrafts();
    }
  }, [activeTab, fetchSharedDrafts]);

  const handleShareFile = async () => {
    if (!selectedUsers.length) {
      message.warning("Please select at least one user.");
      return;
    }

    try {
      setShareLoading(true);

      const payload = {
        FlowChartId: selectedFile?.id,
        UserId: sessionUserData?.Id,
        JsonData: {
          Users: selectedUsers.map((user) => ({
            UserId: user.UserId,
            IsWrite: user.IsWrite,
          })),
        },
      };

      const response = await fetchWithAuth("Design/ShareFlowChart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        message.success(result?.Message || "File shared successfully.");
        setShareModalOpen(false);
        setSelectedUsers([]);
        fetchSharedDrafts();
      } else {
        message.error(result?.Message || "Failed to share file.");
      }
    } catch (err) {
      console.error(err);
      message.error("Something went wrong.");
    } finally {
      setShareLoading(false);
    }
  };

  const fetchSharedUsers = async (flowChartId) => {
    try {
      setLoadingSharedUsers(true);

      const response = await fetchWithAuth(
        `Design/GetSharedDraftusers?OrgId=${sessionUserData.OrgId}&FlowChartId=${flowChartId}&UserId=${sessionUserData?.Id}`,
        {
          method: "GET",
        }
      );

      const result = await response.json();

      if (response.ok) {
        setSharedUsers(result.ResultData || []);
      } else {
        message.error(result.Message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSharedUsers(false);
    }
  };

  const handleEditSharedUsers = async () => {
    try {

      setSaving(true);

      const payload = {
        FlowChartId: selectedFile.id,
        UserId: sessionUserData.Id,
        JsonData: {
          Users: [
            ...sharedUsers.map((u) => ({
              Id: u.SharedDraftId,
              UserId: u.UserId,
              IsWrite: u.IsWrite,
              IsActive: true,
            })),

            ...removedUsers.map((u) => ({
              Id: u.SharedDraftId,
              UserId: u.UserId,
              IsWrite: u.IsWrite,
              IsActive: false,
            })),
          ],
        },
      };

      const response = await fetchWithAuth(
        "Design/EditSharedUsers",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (response.ok) {

        message.success("Permissions updated successfully.");

        setManageShareModal(false);

        fetchSharedUsers(selectedFile.id);

      } else {

        message.error(result.Message);

      }

    } finally {

      setSaving(false);

    }
  };


  const handleAddVersion = (doc) => {

    setSelectedDoc(doc);

    const jsonString =
      LZString.decompressFromBase64(doc.JsonData);

    if (!jsonString) {
      message.error("Unable to load diagram");
      return;
    }

    const diagram = JSON.parse(jsonString);

    onLoadDocument(diagram);

    onStartVersion();

    // Tell parent we're in version mode
    // setIsVersionMode(true);

    onToggle();
  };

  const handleViewVersion = (doc) => {

    setSelectedDoc(doc);

    const jsonString =
      LZString.decompressFromBase64(doc.JsonData);

    if (!jsonString) {
      message.error("Unable to load diagram");
      return;
    }

    const diagram = JSON.parse(jsonString);

    onLoadDocument(diagram);
    onViewVersion();

    onToggle();
  };

  const handleEditVersion = (doc) => {

    setSelectedDoc(doc);

    const jsonString =
      LZString.decompressFromBase64(doc.JsonData);

    if (!jsonString) {
      message.error("Unable to load diagram");
      return;
    }

    const diagram = JSON.parse(jsonString);

    onLoadDocument(diagram);

    onStartEditVersion();

    // Tell parent we're in version mode
    // setIsVersionEditMode(true);

    onToggle();
  };
  

  return (
    <>
      <div className="d-flex align-items-center gap-2">
        <button
          type="button"
          className={styles.menuButton}
          onClick={onToggle}
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
      </div>

      {open && <button type="button" className={styles.backdrop} onClick={onToggle} aria-label="Close menu" />}

      <aside className={[styles.drawer, open ? styles.open : ''].join(' ')}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Files</div>

          <button type="button" className={styles.primaryAction} onClick={onNewFile}>
            <FolderIcon />
            <span>Create New</span>
          </button>

          <div className={styles.tabRow} role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={[styles.tabBtn, activeTab === tab.id ? styles.tabBtnActive : ''].join(' ')}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'documents' && (
            <div className={styles.filterRow}>
              <Select
                value={docTypeFilter}
                onChange={(value) => {
                  setDocTypeFilter(value);
                  fetchEDMDocuments(value);
                }}
                style={{ width: "100%" }}
                placeholder="Select Document Type"
              >
                {docTypeOptions.map((item) => (
                  <Option
                    key={item.MasterTypeId}
                    value={item.MasterTypeId}
                  >
                    {item.TypeName}
                  </Option>
                ))}
              </Select>
            </div>
          )}

          <div className={styles.fileList}>
            {activeTab === 'mine' && visibleDrafts?.length === 0 && (
              <div className={styles.empty}>
                {activeTab === 'mine' && 'No saved files yet'}
              </div>
            )}

            {activeTab === 'shared' && visibleSharedDrafts?.length === 0 && (
              <div className={styles.empty}>
                {activeTab === 'shared' && 'No shared drafts yet'}
              </div>
            )}

            {activeTab === 'documents' && visibleDocuments?.length === 0 && (
              <div className={styles.empty}>No documents match these filters</div>
            )}

            {activeTab === 'mine' && visibleDrafts?.map((file) => (
              <div
                key={file.id}
                className={[styles.fileItem, currentFileId === file.id ? styles.fileItemActive : ''].join(' ')}
                style={{ position: 'relative' }}
              >
                <button
                  type="button"
                  className={styles.fileMain}
                  onClick={() => { onLoadFile(file.id); onToggle(); }}
                >
                  <span className={styles.fileName}>{file.name || 'Untitled diagram'}</span>
                  <span className={styles.fileMeta}>{fmt(file.updatedAt)}</span>
                </button>

                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => onDeleteFile(file.id)}
                  aria-label="Delete file"
                >
                  <DeleteOutlined />
                </button>

                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Share File"
                  onClick={() => {
                    setSelectedFile(file);
                    setSelectedUsers([]);
                    setShareModalOpen(true);
                  }}
                // disabled={true}
                >
                  <ShareAltOutlined />
                </button>

                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Manage Shared Users"
                  onClick={() => {
                    setSelectedFile(file);
                    fetchSharedUsers(file.id);
                    setManageShareModal(true);
                  }}
                // disabled={true}
                >
                  <TeamOutlined />
                </button>
                {/* ✅ Export button with popup */}
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label="Export file"
                  onClick={() => setExportMenuFileId(exportMenuFileId === file.id ? null : file.id)}
                >
                  <CloudDownloadOutlined />
                </button>

                {/* ✅ Export popup menu */}
                {exportMenuFileId === file.id && (
                  <div className={styles.exportMenu}>
                    <button
                      type="button"
                      className={styles.exportMenuItem}
                      onClick={() => handleDownloadLocal(file)}
                      disabled={exporting}
                    >
                      <DownloadOutlined style={{ marginRight: 6 }} />
                      {exporting ? 'Exporting...' : 'Download to Local'}
                    </button>
                    <button
                      type="button"
                      className={styles.exportMenuItem}
                      onClick={() => {
                        setExportMenuFileId(null);
                        onUploadToEdm(file);  // ✅ use the prop directly, not handleUploadToEdm
                      }}
                    >
                      <CloudUploadOutlined style={{ marginRight: 6 }} />
                      Upload to EDM
                    </button>
                  </div>
                )}
              </div>
            ))}

            {activeTab === 'shared' && visibleSharedDrafts?.map((file) => (
              <div
                key={file.id}
                className={[styles.fileItem, currentFileId === file.id ? styles.fileItemActive : ''].join(' ')}
                style={{ position: 'relative' }}
              >
                <button
                  type="button"
                  className={styles.fileMain}
                  onClick={() => {
                    onLoadFile(file.id);
                    onSharedPermission(file.isWrite); // true / false
                    onToggle();
                }}
                >
                  {/* Top Row */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Tooltip title={file.name}>
                      <span
                        className={styles.fileName}
                        style={{
                          maxWidth: "170px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "inline-block",
                          fontWeight: 600,
                        }}
                      >
                        {file.name?.length > 28
                          ? `${file.name.substring(0, 28)}...`
                          : file.name}
                      </span>
                    </Tooltip>

                    <span
                      className="badge rounded-pill d-flex align-items-center"
                      style={{
                        background: "#e6f4ff",
                        color: "#1677ff",
                        fontSize: 11,
                        fontWeight: 600,
                        gap: 4,
                        padding: "4px 8px",
                      }}
                    >
                      <UserOutlined style={{ fontSize: 11 }} />
                      {file.shared}
                    </span>
                  </div>

                  {/* Bottom */}
                  <span className={styles.fileMeta}>
                    {fmt(file.updatedAt)}
                  </span>
                </button>
              </div>
            ))}

            {activeTab === "documents" &&
              visibleDocuments?.map((doc) => (
                <div
                  key={doc.id}
                  className={styles.docItem}
                  onClick={() => {

                    const jsonString =
                      LZString.decompressFromBase64(doc.JsonData);

                    if (!jsonString) {
                      message.error("Unable to load diagram");
                      return;
                    }
                    const diagram = JSON.parse(jsonString);
                    onLoadDocument(diagram);
                    onToggle();
                  }}
                >
                  <span
                    className={`${styles.versionBadge} ${doc.VersionStatus === "PUBLISHED"
                      ? styles.published
                      : styles.notPublished
                      }`}
                  >
                    {doc.VersionStatus === "PUBLISHED"
                      ? "Published"
                      : "Not Published"}
                  </span>

                  <div className={styles.docIconWrap}>
                    <DocIcon />
                  </div>

                  <div className={styles.docBody}>
                    <Tooltip title={doc.name}>
                      <div className={styles.fileName}>
                        {doc.name.length > 20
                          ? `${doc.name.substring(0, 20)}...`
                          : doc.name}
                      </div>
                    </Tooltip>

                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="badge bg-light text-dark border">
                        <UserOutlined className="me-1 text-primary" />
                        {doc.uploadedBy || "Unknown"}
                      </span>

                      <span className="badge bg-light text-dark border">
                        <CalendarOutlined className="me-1 text-primary" />
                        {new Date(
                          doc.CreatedOn.replace("Z", "")
                        ).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className={styles.actionBar}>
                      <Tooltip title={"View Diagram"}>
                        <span style={{ display: "inline-block" }}>
                          <button
                            className={styles.viewBtn}
                            disabled={doc.VersionStatus?.toUpperCase() === "PUBLISHED"}
                            onClick={() => handleViewVersion(doc)}
                          >
                            <EyeOutlined /> View Version
                          </button>
                        </span>
                      </Tooltip>

                      <Tooltip
                        title={
                          doc.VersionStatus?.toUpperCase() === "PUBLISHED"
                            ? "Published versions cannot be edited"
                            : "Edit Version"
                        }
                      >
                        <span style={{ display: "inline-block" }}>
                          <button
                            className={styles.editBtn}
                            disabled={doc.VersionStatus?.toUpperCase() === "PUBLISHED"}
                            onClick={() => handleEditVersion(doc)}
                          >
                            ✏ Edit Version
                          </button>
                        </span>
                      </Tooltip>

                      <Tooltip
                        title={
                          doc.VersionStatus !== "PUBLISHED"
                            ? "Add Version is available only for Published documents"
                            : "Add Version"
                        }
                      >
                        <span style={{ display: "inline-block" }}>
                          <Button
                            className={styles.addBtn}
                            disabled={doc.VersionStatus !== "PUBLISHED"}
                            onClick={() => handleAddVersion(doc)}
                          >
                            + Add Version
                          </Button>
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Theme</div>

          <div className={styles.themeRow}>
            <button
              type="button"
              className={[styles.themeBtn, theme === 'light' ? styles.themeBtnActive : ''].join(' ')}
              onClick={() => onThemeChange('light')}
            >
              <SunIcon />
              <span>Light</span>
            </button>

            <button
              type="button"
              className={[styles.themeBtn, theme === 'dark' ? styles.themeBtnActive : ''].join(' ')}
              onClick={() => onThemeChange('dark')}
            >
              <MoonIcon />
              <span>Dark</span>
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <button type="button" className={styles.toggleRow} onClick={handleGridToggle}>
            <span>Grid</span>
            <span className={[styles.toggleCheck, showGrid ? styles.toggleCheckActive : ''].join(' ')}>OK</span>
          </button>
        </div>

        <div className={styles.section}>
          <button type="button" className={styles.toggleRow} onClick={onToggleAutoArrow}>
            <span>Auto Arrow</span>
            <span className={[styles.toggleCheck, autoArrowEnabled ? styles.toggleCheckActive : ''].join(' ')}>OK</span>
          </button>
        </div>

        <div className={styles.section}>
          <div className={styles.bgSection}>
            <div className={styles.bgLabel}>Canvas Background</div>

            <div className={styles.bgSwatches}>
              {FILL_COLORS.map((color) => (
                <button
                  key={color}
                  className={[
                    styles.bgSwatch,
                    color === 'transparent' ? styles.bgSwatchTransparent : '',
                  ].join(' ')}
                  style={color !== 'transparent' ? { background: color } : undefined}
                  onClick={() => onChangeCanvasBg(color === 'transparent' ? 'transparent' : color)}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>


      {/* Share to users Modal */}
      <Modal
        open={shareModalOpen}
        onCancel={() => setShareModalOpen(false)}
        footer={null}
        centered
        width={600}
        destroyOnClose
      >
        <div className="mb-4">
          <h4 className="mb-1 fw-bold">
            Share Flow Chart
          </h4>

          <div className="text-muted">
            Share <b>{selectedFile?.name}</b> with other users.
          </div>
        </div>

        <label className="fw-semibold mb-2">
          Select Users
        </label>

        <Select
          mode="multiple"
          allowClear
          showSearch
          value={selectedUsers.map(x => x.UserId)}
          style={{ width: "100%" }}
          placeholder="Search by name, email or department"
          optionFilterProp="label"
          maxTagCount={0}
          maxTagPlaceholder={() => (
            <span
              style={{
                background: "#e6f4ff",
                color: "#1677ff",
                padding: "2px 10px",
                borderRadius: 20,
                fontWeight: 600,
                fontSize: 13
              }}
            >
              {selectedUsers.length} Selected
            </span>
          )}
          // onChange={setSelectedUsers}
          onChange={(ids) => {
            setSelectedUsers((prev) =>
              ids.map((id) => {
                const existing = prev.find((x) => x.UserId === id);

                return (
                  existing || {
                    UserId: id,
                    IsWrite: false,
                  }
                );
              })
            );
          }}
        >
          {uploadedByOptions.map((user) => (
            <Select.Option
              key={user.ItemId}
              value={user.ItemId}
              label={`${user.ItemValue} ${user.DisplayValue} ${user.DisplayValue2}`}
            >
              <div className="d-flex flex-column py-1">
                <span style={{ fontWeight: 600 }}>{user.ItemValue}</span>

                <small style={{ color: "#6c757d" }}>
                  📧 {user.DisplayValue}
                </small>

                <small style={{ color: "#1677ff" }}>
                  🏢 {user.DisplayValue2}
                </small>
              </div>
            </Select.Option>
          ))}
        </Select>

        {selectedUsers.length > 0 && (
          <div
            style={{
              marginTop: 20,
              background: "#fafafa",
              border: "1px solid #e8e8e8",
              borderRadius: 12,
              padding: 15
            }}
          >
            <div
              className="d-flex justify-content-between align-items-center mb-3"
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 15
                }}
              >
                Selected Users
              </span>

              <span
                className="badge bg-primary"
                style={{
                  fontSize: 13,
                  padding: "6px 10px"
                }}
              >
                {selectedUsers.length}
              </span>
            </div>

            <div
              style={{
                maxHeight: 220,
                overflowY: "auto",
                paddingRight: 6
              }}
            >
              <Space
                direction="vertical"
                style={{ width: "100%" }}
              >
                {selectedUsers.map((item, index) => {
                  const user = uploadedByOptions.find(
                    (x) => x.ItemId === item.UserId
                  );

                  return (
                    <div
                      key={index}
                      className="d-flex justify-content-between align-items-center"
                      style={{
                        padding: "10px 14px",
                        border: "1px solid #ececec",
                        borderRadius: 10,
                        background: "#fff",
                        marginBottom: 8
                      }}
                    >
                      <div className="d-flex align-items-start gap-3">
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            background: "#1677ff",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 600,
                            fontSize: 13
                          }}
                        >
                          {index + 1}
                        </div>

                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {user?.ItemValue}
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "#6c757d"
                            }}
                          >
                            📧 {user?.DisplayValue}
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "#1677ff"
                            }}
                          >
                            🏢 {user?.DisplayValue2}
                          </div>
                          <div
                            style={{
                              marginTop: 8,
                            }}
                          >
                            <Checkbox
                              checked={item.IsWrite}
                              onChange={(e) => {
                                setSelectedUsers((prev) =>
                                  prev.map((u) =>
                                    u.UserId === item.UserId
                                      ? {
                                        ...u,
                                        IsWrite: e.target.checked,
                                      }
                                      : u
                                  )
                                );
                              }}
                            >
                              Allow Write Access
                            </Checkbox>
                          </div>
                        </div>
                      </div>

                      <Button
                        danger
                        type="text"
                        size="small"
                        onClick={() =>
                          setSelectedUsers((prev) =>
                            prev.filter((x) => x.UserId !== item.UserId)
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  );
                })}
              </Space>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 30,
            gap: 10
          }}
        >
          <Button onClick={() => setShareModalOpen(false)}>
            Cancel
          </Button>

          <Button
            type="primary"
            loading={shareLoading}
            onClick={handleShareFile}
          >
            Share File
          </Button>
        </div>
      </Modal>

      {/* Edit Shared users modal */}
      <Modal
        open={manageShareModal}
        footer={null}
        width={650}
        centered
        destroyOnClose
        onCancel={() => setManageShareModal(false)}
      >
        <div className="mb-4">
          <h4
            style={{
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            Shared Users
          </h4>

          <div
            style={{
              color: "#8c8c8c",
              marginBottom: 16,
            }}
          >
            Manage access for this flow chart.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "#f5f7fa",
              border: "1px solid #e8e8e8",
              borderRadius: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#1677ff",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              📄
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#8c8c8c",
                  marginBottom: 2,
                }}
              >
                Flow Chart
              </div>

              <Tooltip title={selectedFile?.name}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {selectedFile?.name}
                </div>
              </Tooltip>
            </div>
          </div>
        </div>

        <Spin spinning={loadingSharedUsers}>
          {sharedUsers.length === 0 ? (
            <Empty
              description="No users have access."
            />
          ) : (
            <div
              style={{
                maxHeight: 420,
                overflowY: "auto",
                paddingRight: 6
              }}
            >
              {sharedUsers.map((user) => (
                <Card
                  key={user.SharedDraftId}
                  size="small"
                  style={{
                    marginBottom: 12,
                    borderRadius: 12
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex gap-3">
                      <Avatar
                        size={48}
                        style={{
                          background: "#1677ff"
                        }}
                      >
                        {user.Name?.charAt(0)}
                      </Avatar>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 15
                          }}
                        >
                          {user.Name}
                        </div>
                        <div
                          style={{
                            color: "#777"
                          }}
                        >
                          {user.Email}
                        </div>
                      </div>
                    </div>
                    <Checkbox
                      checked={user.IsWrite}
                      onChange={(e) => {
                        setSharedUsers((prev) =>
                          prev.map((u) =>
                            u.SharedDraftId === user.SharedDraftId
                              ? {
                                ...u,
                                IsWrite: e.target.checked,
                              }
                              : u
                          )
                        );
                      }}
                    >
                      Allow Write Access
                    </Checkbox>
                    <Popconfirm
                      title="Remove this user's access?"
                      okText="Remove"
                      cancelText="Cancel"
                      onConfirm={() => {
                        // Keep removed user for API payload
                        setRemovedUsers((prev) => [...prev, user]);

                        // Remove from UI
                        setSharedUsers((prev) =>
                          prev.filter((u) => u.SharedDraftId !== user.SharedDraftId)
                        );
                      }}
                    >
                      <Button danger>
                        Remove
                      </Button>
                    </Popconfirm>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Spin>
        <div className="d-flex justify-content-end gap-2 mt-4">

          <Button onClick={() => setManageShareModal(false)}>
            Cancel
          </Button>

          <Button
            type="primary"
            loading={saving}
            onClick={handleEditSharedUsers}
          >
            Save Changes
          </Button>

        </div>
      </Modal>

      <AddDocVersion
        docObj={selectedDoc}
        versionJson={versionJson}
      />
      <EditDocVersion
        editObj={selectedDoc}
        versionJson={versionJson}
      />
    </>
  );
}