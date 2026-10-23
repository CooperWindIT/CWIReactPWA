// =============================================================
// Feedback Content — listing screen
//
// Path: src/Components/CFM/pages/FeedbackContent.jsx
//
// Metronic page chrome, antd table, and the add/edit panel mounted once at
// the bottom. The feedback types are fetched here rather than in the panel:
// the list needs them to show a type name against each row, and the form
// needs them for its dropdown, so one call serves both.
//
// No display order here — the order of questions is set per request on the
// setup screen.
//
// Each question can be switched Active / Inactive (CFM/InactivefbContents),
// always after a Yes / No.
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Table,
    Input,
    Select,
    Tooltip,
    Tag,
    Empty,
    Modal,
    Switch,
    Segmented,
    message,
} from "antd";

import Base1 from "../../Config/Base1";
import "../../Config/Pagination.css";
import "../../Config/Loader.css";

import RegisterFeedbackContent from "./RegisterFeedbackcontent";
import {
    getFeedbackContents,
    getMasterTypes,
    setFeedbackContentActive,
    readRows,
    readResult,
} from "../Services/cfmServices";

const OFFCANVAS_ID = "offcanvasRightAddContent";

// The menu these permissions come from. Your sample read "Alerts", which is
// the alerts screen's menu — set this to the MenuName the feedback module
// returns, or the Add/Edit buttons key off the wrong row.
const MENU_NAME = "Feedback Content";

// IsActive arrives as 1/0, true/false or "1"/"0". A row without it counts
// as active, so older data doesn't show everything as switched off.
const isActiveRow = (record) => {
    const value = record?.IsActive;
    if (value === undefined || value === null || value === "") return true;
    return value === true || value === 1 || ["1", "true", "yes"].includes(String(value).trim().toLowerCase());
};

function openOffcanvas(id) {
    const el = document.getElementById(id);
    if (!el) return;

    const OffcanvasApi = window.bootstrap?.Offcanvas;

    const instance =
        OffcanvasApi &&
        (OffcanvasApi.getInstance(el) || OffcanvasApi.getOrCreateInstance(el));

    if (instance) {
        instance.show();
        return;
    }

    const opener = document.createElement("button");
    opener.type = "button";
    opener.setAttribute("data-bs-toggle", "offcanvas");
    opener.setAttribute("data-bs-target", `#${id}`);
    opener.style.display = "none";
    document.body.appendChild(opener);
    opener.click();
    opener.remove();
}

export default function FeedbackContent() {
    const navigate = useNavigate();

    const [sessionUserData, setSessionUserData] = useState({});
    const [navigationPath, setNavigationPath] = useState("");
    const [sessionActionIds, setSessionActionIds] = useState([]);

    const [contents, setContents] = useState([]);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState(null);

    const [editingContent, setEditingContent] = useState(null);

    // Active / inactive: the row being switched, and the All / Active /
    // Inactive filter.
    const [togglingId, setTogglingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [modal, modalHolder] = Modal.useModal();

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const navigationString = sessionStorage.getItem("navigationPath");

        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
            setNavigationPath(navigationString);
        } else {
            navigate("/");
        }
    }, [navigate]);

   useEffect(() => {
           const sessionMenuData = sessionStorage.getItem("menuData");
           try {
               const parsedMenu = JSON.parse(sessionMenuData);
            //    setMenuData(parsedMenu);
               // Find Dashboard and Visitors menus
               const dashboardMenu = parsedMenu.find(
                   (item) => item.MenuName === "Contents"
               );
   
               let actionIds = [];
               if (dashboardMenu?.ActionsIds) {
                   actionIds = actionIds.concat(
                       dashboardMenu.ActionsIds.split(",").map(Number)
                   );
               }
   
               if (actionIds.length > 0) {
                   // Remove duplicates just in case
                   const uniqueActionIds = [...new Set(actionIds)];
                   setSessionActionIds(uniqueActionIds);
               }
           } catch (err) {
               console.error("Error parsing menuData:", err);
           }
       }, []);

    // -------------------------------------------------------------
    // DATA
    // -------------------------------------------------------------

    const fetchTypes = async () => {
        try {
            const response = await getMasterTypes({ orgId: sessionUserData.OrgId });
            setTypes(readRows(response));
        } catch (error) {
            console.error("GetMasterTypes failed:", error);
            message.error("Couldn't load the feedback types.");
        }
    };

    const fetchContents = async () => {
        try {
            setLoading(true);

            const response = await getFeedbackContents({
                orgId: sessionUserData.OrgId,
            });

            setContents(readRows(response));
        } catch (error) {
            console.error("GetFeedbackContents failed:", error);
            message.error("Couldn't load the feedback content.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!sessionUserData?.OrgId) return;

        fetchTypes();
        fetchContents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionUserData?.OrgId]);

    // The list may or may not carry a TypeName, depending on what the listing
    // route joins in — so it is resolved from the dropdown data either way.
    const typeNameById = useMemo(() => {
        const map = new Map();
        types.forEach((type) => map.set(Number(type.Id), type.TypeName));
        return map;
    }, [types]);

    const typeNameOf = (row) =>
        row.TypeName || typeNameById.get(Number(row.TypeId)) || "—";

    // -------------------------------------------------------------
    // ACTIVE / INACTIVE
    //   CFM/InactivefbContents { Id, IsActive 1|0, UpdatedBy } — always after
    //   a Yes / No.
    // -------------------------------------------------------------

    const handleToggleActive = (record) => {
        const activate = !isActiveRow(record);

        modal.confirm({
            className: "cfm-confirm",
            centered: true,
            icon: null,
            title: (
                <div className="cfm-confirm-head">
                    <span className={`cfm-confirm-icon ${activate ? "on" : "off"}`}>
                        <i className={`bi ${activate ? "bi-check2-circle" : "bi-slash-circle"}`}></i>
                    </span>
                    <span>{activate ? "Activate this question?" : "Deactivate this question?"}</span>
                </div>
            ),
            content: (
                <div className="cfm-confirm-body">
                    <div className="cfm-confirm-chip">
                        <span className="cfm-confirm-type">{typeNameOf(record)}</span>
                        <span className="cfm-confirm-text">{record.ContentText}</span>
                    </div>
                    <p>
                        {activate
                            ? "It can be added to new feedback requests again."
                            : "It won't be offered for new feedback requests. Requests that already have it keep it, along with any answers."}
                    </p>
                </div>
            ),
            okText: activate ? "Yes, activate" : "Yes, deactivate",
            cancelText: "No",
            okButtonProps: {
                className: activate ? "cfm-confirm-ok on" : "cfm-confirm-ok off",
            },
            cancelButtonProps: { className: "cfm-confirm-cancel" },
            onOk: async () => {
                try {
                    setTogglingId(record.Id);

                    const response = await setFeedbackContentActive({
                        orgId: sessionUserData.OrgId,
                        userId: sessionUserData.Id ?? sessionUserData.UserId,
                        contentId: record.Id,
                        isActive: activate,
                    });

                    const result = readResult(response);

                    if (!result.ok) {
                        message.error(
                            result.message ||
                                `Couldn't ${activate ? "activate" : "deactivate"} this question.`
                        );
                        return;
                    }

                    // Flip the row straight away rather than reloading the list.
                    setContents((prev) =>
                        prev.map((row) =>
                            row.Id === record.Id ? { ...row, IsActive: activate ? 1 : 0 } : row
                        )
                    );

                    // The service's own message is a generic "Query executed
                    // successfully", so the toast says what actually changed.
                    message.success(`Question ${activate ? "activated" : "deactivated"}.`);
                } catch (error) {
                    console.error("InactivefbContents failed:", error);
                    message.error("Something went wrong. Please try again.");
                } finally {
                    setTogglingId(null);
                }
            },
        });
    };

    // -------------------------------------------------------------
    // FILTERS — rows stay in the order the service returns them
    // -------------------------------------------------------------

    const activeCount = useMemo(() => contents.filter(isActiveRow).length, [contents]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return contents
            .filter((row) =>
                statusFilter === "all"
                    ? true
                    : statusFilter === "active"
                    ? isActiveRow(row)
                    : !isActiveRow(row)
            )
            .filter((row) =>
                typeFilter ? Number(row.TypeId) === Number(typeFilter) : true
            )
            .filter((row) =>
                term
                    ? [row.ContentText, typeNameOf(row)]
                          .filter(Boolean)
                          .some((value) => String(value).toLowerCase().includes(term))
                    : true
            );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contents, search, typeFilter, statusFilter, typeNameById]);

    // -------------------------------------------------------------
    // PERMISSIONS
    // -------------------------------------------------------------

    const showAddBtn = sessionActionIds?.includes(1);
    const showEditBtn = sessionActionIds?.includes(3);

    const openAdd = () => {
        setEditingContent(null);
        openOffcanvas(OFFCANVAS_ID);
    };

    const openEdit = (record) => {
        setEditingContent(record);
        openOffcanvas(OFFCANVAS_ID);
    };

    // -------------------------------------------------------------
    // TABLE
    // -------------------------------------------------------------

    const FlagTags = ({ record }) => (
        <div className="d-flex align-items-center gap-2 flex-wrap">
            {Number(record.IsRequired) === 1 ? (
                <Tag className="cfm-tag required">Required</Tag>
            ) : (
                <Tag className="cfm-tag optional">Optional</Tag>
            )}

            {Number(record.IsDefault) === 1 && (
                <Tag className="cfm-tag default">Default</Tag>
            )}
        </div>
    );

    const RowActions = ({ record }) =>
        showEditBtn ? (
            <Tooltip title="Edit">
                <button
                    type="button"
                    className="cfm-icon-btn edit"
                    onClick={() => openEdit(record)}
                >
                    <i className="bi bi-pencil-fill"></i>
                </button>
            </Tooltip>
        ) : (
            <span className="text-muted fs-8">—</span>
        );

    // The switch itself. Only someone with Edit rights can flip it; everyone
    // else sees the state.
    const StatusSwitch = ({ record }) => {
        const active = isActiveRow(record);

        return (
            <Tooltip
                title={
                    !showEditBtn
                        ? active
                            ? "Active"
                            : "Inactive"
                        : active
                        ? "Click to deactivate"
                        : "Click to activate"
                }
            >
                <span className="d-inline-flex">
                    <Switch
                        className="cfm-status-switch"
                        checked={active}
                        loading={togglingId === record.Id}
                        disabled={!showEditBtn || (togglingId !== null && togglingId !== record.Id)}
                        checkedChildren="Active"
                        unCheckedChildren="Inactive"
                        onClick={(_checked, event) => {
                            event?.stopPropagation?.();
                            handleToggleActive(record);
                        }}
                        // Stays put until the Yes / No is answered.
                        onChange={() => {}}
                    />
                </span>
            </Tooltip>
        );
    };

    const columns = [
        {
            title: "Type",
            dataIndex: "TypeId",
            width: 190,
            render: (_value, record) => (
                <span className="cfm-type-chip">
                    <i className="bi bi-collection me-2"></i>
                    {typeNameOf(record)}
                </span>
            ),
        },
        {
            title: "Content",
            dataIndex: "ContentText",
            render: (value) => (
                <div className="cfm-content-text">{value || "—"}</div>
            ),
        },
        {
            title: "Behaviour",
            width: 200,
            render: (_value, record) => <FlagTags record={record} />,
        },
        {
            title: "Status",
            dataIndex: "IsActive",
            width: 130,
            align: "center",
            className: "cfm-status-cell",
            render: (_value, record) => <StatusSwitch record={record} />,
        },
        {
            title: "Action",
            width: 100,
            align: "center",
            className: "cfm-status-cell",
            render: (_value, record) => (
                <div className="d-flex justify-content-center">
                    <RowActions record={record} />
                </div>
            ),
        },
    ];

    return (
        <Base1>

            {/* ================= TOOLBAR ================= */}

            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div
                    id="kt_app_toolbar_container"
                    className="app-container container-xxl d-flex flex-stack"
                >
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">
                            Contents
                        </h1>

                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a
                                    href={navigationPath}
                                    className="text-muted text-hover-primary"
                                >
                                    Home
                                </a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">
                                Contents
                            </li>
                        </ul>
                    </div>

                    {showAddBtn && (
                        <div className="d-flex align-items-center gap-2 gap-lg-3">
                            <button
                                type="button"
                                className="cfm-btn-add"
                                onClick={openAdd}
                            >
                                <i className="bi bi-plus-lg text-white"></i>
                                <span>Register Content</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= CONTENT ================= */}

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl">

                    <div className="cfm-card">

                        <div className="cfm-card-head">
                            <div className="cfm-card-lead">
                                <span className="cfm-card-badge">
                                    <i className="bi bi-chat-left-text-fill text-white"></i>
                                </span>

                                <div>
                                    <h3 className="cfm-card-title">Questions</h3>
                                    <div className="cfm-card-sub">
                                        {loading
                                            ? "Loading…"
                                            : `${filtered.length} of ${contents.length} question${
                                                  contents.length === 1 ? "" : "s"
                                              }`}
                                    </div>
                                </div>
                            </div>

                            <div className="cfm-card-tools">
                                <Segmented
                                    size="large"
                                    className="cfm-status-filter"
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    options={[
                                        { value: "all", label: `All ${contents.length}` },
                                        { value: "active", label: `Active ${activeCount}` },
                                        {
                                            value: "inactive",
                                            label: `Inactive ${contents.length - activeCount}`,
                                        },
                                    ]}
                                />

                                <Select
                                    allowClear
                                    size="large"
                                    className="cfm-type-filter"
                                    placeholder="All types"
                                    value={typeFilter}
                                    onChange={setTypeFilter}
                                    options={types.map((type) => ({
                                        value: type.Id,
                                        label: type.TypeName,
                                    }))}
                                />

                                <Input
                                    allowClear
                                    size="large"
                                    className="cfm-search"
                                    placeholder="Search question text"
                                    prefix={<i className="bi bi-search" />}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />

                                <Tooltip title="Refresh">
                                    <button
                                        type="button"
                                        className="cfm-icon-btn refresh"
                                        onClick={fetchContents}
                                        disabled={loading}
                                    >
                                        <i
                                            className={`bi bi-arrow-clockwise ${
                                                loading ? "cfm-spin" : ""
                                            }`}
                                        ></i>
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {/* ---- Desktop ---- */}

                        <div className="d-none d-md-block cfm-table-wrap">
                            <Table
                                rowKey={(record) => record.Id}
                                columns={columns}
                                dataSource={filtered}
                                loading={loading}
                                size="middle"
                                scroll={{ x: 950 }}
                                rowClassName={(record) =>
                                    isActiveRow(record) ? "" : "cfm-row-inactive"
                                }
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    pageSizeOptions: [10, 20, 50],
                                    showTotal: (total, range) =>
                                        `${range[0]}–${range[1]} of ${total}`,
                                }}
                                locale={{
                                    emptyText: (
                                        <Empty
                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                            description={
                                                search || typeFilter || statusFilter !== "all"
                                                    ? "Nothing matches those filters"
                                                    : "No feedback content yet"
                                            }
                                        />
                                    ),
                                }}
                            />
                        </div>

                        {/* ---- Mobile ---- */}

                        <div className="d-block d-md-none cfm-mobile-list">
                            {!loading && filtered.length === 0 && (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        search || typeFilter || statusFilter !== "all"
                                            ? "Nothing matches those filters"
                                            : "No feedback content yet"
                                    }
                                />
                            )}

                            {filtered.map((record) => (
                                <div
                                    className={`cfm-mobile-card ${
                                        isActiveRow(record) ? "" : "is-inactive"
                                    }`}
                                    key={record.Id}
                                >
                                    <div className="d-flex align-items-start">
                                        <div className="flex-grow-1 min-w-0">
                                            <span className="cfm-type-chip">
                                                <i className="bi bi-collection me-2"></i>
                                                {typeNameOf(record)}
                                            </span>

                                            <div className="cfm-content-text mt-2">
                                                {record.ContentText}
                                            </div>
                                        </div>

                                        <div className="ms-2">
                                            <RowActions record={record} />
                                        </div>
                                    </div>

                                    <div className="mt-3">
                                        <FlagTags record={record} />
                                    </div>

                                    <div className="cfm-mobile-status">
                                        <span>Status</span>
                                        <StatusSwitch record={record} />
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </div>

            {modalHolder}

            {/* ================= ADD / EDIT PANEL ================= */}

            <RegisterFeedbackContent
                offcanvasId={OFFCANVAS_ID}
                content={editingContent}
                types={types}
                orgId={sessionUserData?.OrgId}
                userId={sessionUserData?.Id}
                onSaved={fetchContents}
            />

            {/* ================= STYLES ================= */}

            <style>{`

                .cfm-btn-add {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 9px;
                    height: 44px;
                    padding: 0 22px;
                    border: none;
                    border-radius: 12px;
                    font-size: 13.5px;
                    font-weight: 600;
                    color: #ffffff;
                    cursor: pointer;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 10px 22px rgba(2, 113, 174, 0.30);
                    transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
                }

                .cfm-btn-add:hover {
                    transform: translateY(-1px);
                    filter: brightness(1.06);
                    box-shadow: 0 14px 26px rgba(2, 113, 174, 0.34);
                }


                /* ----- Card ----- */

                .cfm-card {
                    background: #ffffff;
                    border: 1px solid #e8eef5;
                    border-radius: 18px;
                    box-shadow: 0 10px 30px rgba(22, 50, 80, 0.07);
                    overflow: hidden;
                }

                .cfm-card-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    flex-wrap: wrap;
                    padding: 20px 22px;
                    border-bottom: 1px solid #eef3f8;
                    background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
                }

                .cfm-card-lead {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    min-width: 0;
                }

                .cfm-card-badge {
                    width: 46px;
                    height: 46px;
                    flex: none;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ffffff;
                    font-size: 18px;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 8px 18px rgba(2, 113, 174, 0.30);
                }

                .cfm-card-title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: #12263f;
                    letter-spacing: -0.01em;
                }

                .cfm-card-sub {
                    margin-top: 2px;
                    font-size: 12.5px;
                    color: #8190a0;
                }

                .cfm-card-tools {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .cfm-search { width: 280px; border-radius: 11px; border-color: #dfe6ef; background: #fbfcfe; }
                .cfm-search .bi { color: #9aa6b4; }
                .cfm-search:hover { border-color: #b9cbe0; }

                .cfm-type-filter { width: 190px; }

                /* antd v6 renamed this inner box from .ant-select-selector to
                   .ant-select-content — both are listed so the rounding holds
                   whichever version is installed. */
                .cfm-type-filter .ant-select-content,
                .cfm-type-filter .ant-select-selector {
                    border-radius: 11px !important;
                    border-color: #dfe6ef !important;
                    background: #fbfcfe !important;
                }


                /* ----- Table ----- */

                .cfm-table-wrap { padding: 6px 10px 10px; }

                .cfm-table-wrap .ant-table { background: transparent; font-size: 13.5px; }

                .cfm-table-wrap .ant-table-thead > tr > th {
                    background: #f7fafd;
                    color: #6b7a8d;
                    font-size: 11.5px;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    border-bottom: 1px solid #eef3f8;
                }

                .cfm-table-wrap .ant-table-tbody > tr > td {
                    border-bottom: 1px solid #f2f6fa;
                    padding-top: 12px;
                    padding-bottom: 12px;
                }

                .cfm-table-wrap .ant-table-tbody > tr:hover > td { background: #f8fbff; }

                .cfm-type-chip {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 11px;
                    border-radius: 9px;
                    background: #f2f9ff;
                    border: 1px solid #daebf8;
                    color: #0271ae;
                    font-size: 12.5px;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .cfm-content-text {
                    font-size: 13.5px;
                    color: #12263f;
                    line-height: 1.5;
                }


                /* ----- Tags ----- */

                .cfm-tag {
                    margin: 0;
                    border: none;
                    border-radius: 8px;
                    padding: 3px 10px;
                    font-size: 11.5px;
                    font-weight: 600;
                }

                .cfm-tag.required { background: #fff1f2; color: #e11d48; }
                .cfm-tag.optional { background: #f1f5f9; color: #64748b; }
                .cfm-tag.default  { background: #ecfdf5; color: #059669; }


                /* ----- Icon buttons ----- */

                .cfm-icon-btn {
                    width: 34px;
                    height: 34px;
                    flex: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    border: 1px solid #e6edf5;
                    background: #ffffff;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all .18s ease;
                }

                .cfm-icon-btn.edit { color: #0271ae; }

                .cfm-icon-btn.edit:hover {
                    background: #0271ae;
                    border-color: #0271ae;
                    color: #ffffff;
                    transform: translateY(-1px);
                    box-shadow: 0 8px 16px rgba(2, 113, 174, 0.25);
                }

                .cfm-icon-btn.refresh {
                    width: 44px;
                    height: 44px;
                    border-radius: 11px;
                    color: #46566a;
                    font-size: 15px;
                }

                .cfm-icon-btn.refresh:hover:not(:disabled) {
                    border-color: #b9cbe0;
                    color: #0271ae;
                }

                .cfm-icon-btn:disabled { opacity: .6; cursor: not-allowed; }


                /* ----- Active / inactive ----- */

                .cfm-status-switch.ant-switch { min-width: 82px; background: #cbd5e1; }

                .cfm-status-switch.ant-switch.ant-switch-checked { background: #10b981; }

                .cfm-status-switch.ant-switch.ant-switch-checked:hover:not(.ant-switch-disabled) { background: #059669; }

                .cfm-status-switch.ant-switch:not(.ant-switch-checked):hover:not(.ant-switch-disabled) { background: #94a3b8; }

                .cfm-status-switch .ant-switch-inner { font-size: 11px; font-weight: 600; }

                /* An inactive row fades back; its switch and buttons stay clear. */
                .cfm-row-inactive > td:not(.cfm-status-cell) { opacity: .5; }

                .cfm-row-inactive .cfm-content-text { text-decoration: line-through; text-decoration-color: rgba(18, 38, 63, .35); }

                .cfm-mobile-card.is-inactive { background: #fafbfc; }

                .cfm-mobile-card.is-inactive .cfm-content-text,
                .cfm-mobile-card.is-inactive .cfm-type-chip { opacity: .55; }

                .cfm-mobile-status {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 12px;
                    padding-top: 10px;
                    border-top: 1px dashed #eef3f8;
                    font-size: 12px;
                    font-weight: 600;
                    color: #8190a0;
                }

                .cfm-status-filter.ant-segmented {
                    padding: 3px;
                    border-radius: 11px;
                    background: #f1f5fa;
                }

                .cfm-status-filter .ant-segmented-item { border-radius: 9px; }

                .cfm-status-filter .ant-segmented-item-label { font-size: 13px; font-weight: 600; padding: 0 12px; }

                .cfm-status-filter .ant-segmented-item-selected { color: #0271ae; }


                /* ----- Yes / No pop-up ----- */

                .cfm-confirm .ant-modal-content,
                .cfm-confirm .ant-modal-container { border-radius: 20px; padding: 22px 24px; }

                .cfm-confirm .ant-modal-confirm-paragraph { max-width: 100%; }

                .cfm-confirm-head { display: flex; align-items: center; gap: 12px; font-size: 17px; font-weight: 700; color: #12263f; }

                .cfm-confirm-icon {
                    width: 42px;
                    height: 42px;
                    flex: none;
                    border-radius: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ffffff;
                    font-size: 18px;
                }

                .cfm-confirm-icon.on { background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 8px 18px rgba(16, 185, 129, .3); }

                .cfm-confirm-icon.off { background: linear-gradient(135deg, #fb7185, #e11d48); box-shadow: 0 8px 18px rgba(225, 29, 72, .28); }

                .cfm-confirm-body { margin-top: 14px; }

                .cfm-confirm-chip {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding: 10px 12px;
                    border-radius: 12px;
                    background: #f6f9fc;
                    border: 1px solid #e8eef5;
                }

                .cfm-confirm-type {
                    align-self: flex-start;
                    padding: 2px 9px;
                    border-radius: 7px;
                    background: #e8f4fc;
                    color: #0271ae;
                    font-size: 11.5px;
                    font-weight: 700;
                }

                .cfm-confirm-text { font-size: 13.5px; font-weight: 600; color: #12263f; line-height: 1.45; }

                .cfm-confirm-body p { margin: 12px 0 0; font-size: 13.5px; color: #6b7a8d; }

                .cfm-confirm .ant-modal-confirm-btns .ant-btn { height: 40px; padding: 0 20px; border-radius: 11px; font-weight: 600; }

                .cfm-confirm .cfm-confirm-ok { border: none; }

                .cfm-confirm .cfm-confirm-ok.on { background: linear-gradient(135deg, #10b981, #059669) !important; }

                .cfm-confirm .cfm-confirm-ok.off { background: linear-gradient(135deg, #fb7185, #e11d48) !important; }

                .cfm-spin { display: inline-block; animation: cfmSpin 1s linear infinite; }

                @keyframes cfmSpin { to { transform: rotate(360deg); } }


                /* ----- Mobile ----- */

                .cfm-mobile-list { padding: 14px; }

                .cfm-mobile-card {
                    padding: 14px;
                    border: 1px solid #eef3f8;
                    border-radius: 14px;
                    background: #ffffff;
                    box-shadow: 0 6px 16px rgba(22, 50, 80, 0.05);
                }

                .cfm-mobile-card + .cfm-mobile-card { margin-top: 12px; }

                @media (max-width: 767.98px) {

                    .cfm-card-head { padding: 16px; gap: 12px; }

                    .cfm-card-tools { width: 100%; flex-wrap: wrap; }

                    .cfm-status-filter.ant-segmented { width: 100%; display: flex; }

                    .cfm-status-filter .ant-segmented-group { width: 100%; }

                    .cfm-status-filter .ant-segmented-item { flex: 1 1 0; text-align: center; }

                    .cfm-type-filter { flex: 1 1 0; width: auto; min-width: 0; }

                    .cfm-search { flex: 1 1 100%; width: 100%; order: 3; }

                    .cfm-btn-add { height: 42px; padding: 0 16px; font-size: 12.5px; }

                }

            `}</style>
        </Base1>
    );
}