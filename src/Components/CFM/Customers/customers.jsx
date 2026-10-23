import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Table,
    Input,
    Tooltip,
    Popconfirm,
    Empty,
    Modal,
    Switch,
    Segmented,
    message,
} from "antd";

import Base1 from "../../Config/Base1";
import "../../Config/Pagination.css";
import "../../Config/Loader.css";
import { BASE_IMAGE_API_GET } from "../../Config/Config";

import RegisterCustomer from "./registerCustomer";
import {
    getCustomers,
    deleteCustomer,
    setCustomerActive,
    readRows,
    readResult,
    DELETE_CUSTOMER_ENDPOINT,
} from "../Services/cfmServices";

const OFFCANVAS_ID = "offcanvasRightAddCustomer";

// The menu this screen's permissions come from. Your sample read "Alerts",
// which is the alerts screen's menu — with that name the Add/Edit buttons
// take their permissions from the wrong row, or from none at all. Set this to
// the MenuName the CFM module returns.
const MENU_NAME = "Customers";

// Opens the Bootstrap offcanvas from code, for the Edit buttons: the row has
// to be put into state first, so they can't use data-bs-toggle on their own.
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

    // Bootstrap imported as a module rather than on window: let its own
    // delegated handler do the opening.
    const opener = document.createElement("button");
    opener.type = "button";
    opener.setAttribute("data-bs-toggle", "offcanvas");
    opener.setAttribute("data-bs-target", `#${id}`);
    opener.style.display = "none";
    document.body.appendChild(opener);
    opener.click();
    opener.remove();
}

// IsActive arrives as 1/0, true/false or "1"/"0". A row without it counts
// as active, so older data doesn't show everyone as switched off.
const isActiveRow = (record) => {
    const value = record?.IsActive;
    if (value === undefined || value === null || value === "") return true;
    return value === true || value === 1 || ["1", "true", "yes"].includes(String(value).trim().toLowerCase());
};

const initials = (name) =>
    String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

// GetCustomers returns the logo as LogoImgURL (ImageUrl kept as a fallback).
// File names can carry spaces or brackets, so the path is encoded.
const logoPathOf = (record) => record?.LogoImgURL || record?.ImageUrl || "";

const logoUrlOf = (record) => {
    const path = logoPathOf(record);
    return path ? `${BASE_IMAGE_API_GET}${encodeURI(path)}` : null;
};

export default function Customers() {
    const navigate = useNavigate();

    const [sessionUserData, setSessionUserData] = useState({});
    const [navigationPath, setNavigationPath] = useState("");
    const [sessionActionIds, setSessionActionIds] = useState([]);

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // null = the panel is in "add" mode.
    const [editingCustomer, setEditingCustomer] = useState(null);

    const [deletingId, setDeletingId] = useState(null);

    // Active / inactive: the row being switched, and the All / Active /
    // Inactive filter.
    const [togglingId, setTogglingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [modal, modalHolder] = Modal.useModal();

    // Logos that failed to load fall back to initials, remembered per row.
    const [brokenLogos, setBrokenLogos] = useState({});

    // The customer whose logo is open in the large view.
    const [logoPreview, setLogoPreview] = useState(null);

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
                // setMenuData(parsedMenu)
                // Find Dashboard and Visitors menus
                const dashboardMenu = parsedMenu.find(
                    (item) => item.MenuName === "Customers"
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

    const fetchCustomers = async () => {
        if (!sessionUserData?.OrgId) return;

        try {
            setLoading(true);

            const response = await getCustomers({ orgId: sessionUserData.OrgId });
            setCustomers(readRows(response));
            // A re-uploaded logo gets a fresh chance to load.
            setBrokenLogos({});
        } catch (error) {
            console.error("GetCustomers failed:", error);
            message.error("Couldn't load the customer list.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionUserData?.OrgId]);

    const handleDelete = async (record) => {
        try {
            setDeletingId(record.Id);

            const response = await deleteCustomer({
                orgId: sessionUserData.OrgId,
                userId: sessionUserData.Id,
                customerId: record.Id,
            });

            const result = readResult(response);

            if (result.ok) {
                message.success(result.message || "Customer removed.");
                fetchCustomers();
            } else {
                message.error(result.message || "Could not remove the customer.");
            }
        } catch (error) {
            console.error("DeleteCustomer failed:", error);
            message.error(error.message || "Something went wrong.");
        } finally {
            setDeletingId(null);
        }
    };

    // -------------------------------------------------------------
    // ACTIVE / INACTIVE
    //   CFM/InactiveCustomer { Id, IsActive 1|0, UpdatedBy } — always after
    //   a Yes / No, since an inactive customer drops out of new requests.
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
                        <i className={`bi ${activate ? "bi-person-check-fill" : "bi-person-dash-fill"}`}></i>
                    </span>
                    <span>{activate ? "Activate this customer?" : "Deactivate this customer?"}</span>
                </div>
            ),
            content: (
                <div className="cfm-confirm-body">
                    <div className="cfm-confirm-chip">
                        <i className="bi bi-building me-2"></i>
                        {record.CustomerName}
                    </div>
                    <p>
                        {activate
                            ? "They'll be available again for new feedback requests."
                            : "They won't be available for new feedback requests. Their existing requests and feedback stay as they are."}
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

                    const response = await setCustomerActive({
                        orgId: sessionUserData.OrgId,
                        userId: sessionUserData.Id ?? sessionUserData.UserId,
                        customerId: record.Id,
                        isActive: activate,
                    });

                    const result = readResult(response);

                    if (!result.ok) {
                        message.error(
                            result.message ||
                                `Couldn't ${activate ? "activate" : "deactivate"} this customer.`
                        );
                        return;
                    }

                    // Flip the row straight away rather than reloading the list.
                    setCustomers((prev) =>
                        prev.map((row) =>
                            row.Id === record.Id ? { ...row, IsActive: activate ? 1 : 0 } : row
                        )
                    );

                    // The service's own message is a generic "Query executed
                    // successfully", so the toast says what actually changed.
                    message.success(
                        `${record.CustomerName} is now ${activate ? "active" : "inactive"}.`
                    );
                } catch (error) {
                    console.error("InactiveCustomer failed:", error);
                    message.error("Something went wrong. Please try again.");
                } finally {
                    setTogglingId(null);
                }
            },
        });
    };

    // -------------------------------------------------------------
    // SEARCH + STATUS FILTER
    // -------------------------------------------------------------

    const activeCount = useMemo(() => customers.filter(isActiveRow).length, [customers]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        return customers
            .filter((row) =>
                statusFilter === "all"
                    ? true
                    : statusFilter === "active"
                    ? isActiveRow(row)
                    : !isActiveRow(row)
            )
            .filter((row) =>
                !term
                    ? true
                    : [row.CustomerName, row.ContactPerson, row.Email, row.MobileNumber, row.Address]
                          .filter(Boolean)
                          .some((value) => String(value).toLowerCase().includes(term))
            );
    }, [customers, search, statusFilter]);

    // -------------------------------------------------------------
    // PERMISSIONS
    // -------------------------------------------------------------

    const showAddBtn = sessionActionIds?.includes(1);
    const showEditBtn = sessionActionIds?.includes(3);

    // Hidden until there is an endpoint to call — see cfmServices.js.
    const showDeleteBtn =
        sessionActionIds?.includes(11) && Boolean(DELETE_CUSTOMER_ENDPOINT);

    const openAdd = () => {
        setEditingCustomer(null);
        openOffcanvas(OFFCANVAS_ID);
    };

    const openEdit = (record) => {
        setEditingCustomer(record);
        openOffcanvas(OFFCANVAS_ID);
    };

    // -------------------------------------------------------------
    // LOGO
    // -------------------------------------------------------------

    const markBroken = (record) =>
        setBrokenLogos((prev) => ({ ...prev, [record.Id]: true }));

    // The customer's logo, or their initials when there's none (or it won't
    // load). Only a real logo opens the large view.
    const CustomerLogo = ({ record, size = 42 }) => {
        const src = !brokenLogos[record.Id] ? logoUrlOf(record) : null;

        if (!src) {
            return (
                <span
                    className="cfm-logo initials"
                    style={{ width: size, height: size, fontSize: Math.round(size * 0.34) }}
                >
                    {initials(record.CustomerName)}
                </span>
            );
        }

        return (
            <Tooltip title="View logo">
                <button
                    type="button"
                    className="cfm-logo has-img"
                    style={{ width: size, height: size }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setLogoPreview(record);
                    }}
                    aria-label={`View ${record.CustomerName} logo`}
                >
                    <img
                        src={src}
                        alt={record.CustomerName}
                        loading="lazy"
                        onError={() => markBroken(record)}
                    />
                    <span className="cfm-logo-zoom">
                        <i className="bi bi-arrows-angle-expand"></i>
                    </span>
                </button>
            </Tooltip>
        );
    };

    const previewSrc = logoPreview ? logoUrlOf(logoPreview) : null;

    // -------------------------------------------------------------
    // TABLE
    // -------------------------------------------------------------

    const CustomerCell = ({ record }) => (
        <div className="d-flex align-items-center">
            <CustomerLogo record={record} />

            <div className="ms-3 min-w-0">
                <div className="cfm-cell-title">{record.CustomerName || "—"}</div>
                <div className="cfm-cell-sub">
                    <i className="bi bi-geo-alt me-1"></i>
                    {record.Address || "No address"}
                </div>
            </div>
        </div>
    );

    const RowActions = ({ record }) => (
        <div className="d-flex align-items-center justify-content-center gap-2">
            {showEditBtn && (
                <Tooltip title="Edit">
                    <button
                        type="button"
                        className="cfm-icon-btn edit"
                        onClick={() => openEdit(record)}
                    >
                        <i className="bi bi-pencil-fill"></i>
                    </button>
                </Tooltip>
            )}

            {showDeleteBtn && (
                <Popconfirm
                    title="Remove this customer?"
                    description="This cannot be undone."
                    okText="Remove"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true, loading: deletingId === record.Id }}
                    onConfirm={() => handleDelete(record)}
                >
                    <Tooltip title="Delete">
                        <button type="button" className="cfm-icon-btn delete">
                            <i className="bi bi-trash3-fill"></i>
                        </button>
                    </Tooltip>
                </Popconfirm>
            )}

            {!showEditBtn && !showDeleteBtn && (
                <span className="text-muted fs-8">—</span>
            )}
        </div>
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
            title: "#",
            width: 64,
            align: "center",
            render: (_value, _record, index) => (
                <span className="cfm-serial">{index + 1}</span>
            ),
        },
        {
            title: "Customer",
            dataIndex: "CustomerName",
            sorter: (a, b) =>
                String(a.CustomerName || "").localeCompare(String(b.CustomerName || "")),
            render: (_value, record) => <CustomerCell record={record} />,
        },
        {
            title: "Contact Person",
            dataIndex: "ContactPerson",
            width: 180,
            render: (value) =>
                value ? (
                    <span className="cfm-contact">
                        <i className="bi bi-person-circle me-2"></i>
                        {value}
                    </span>
                ) : (
                    <span className="text-muted">—</span>
                ),
        },
        {
            title: "Email",
            dataIndex: "Email",
            width: 240,
            render: (value) =>
                value ? (
                    <a href={`mailto:${value}`} className="cfm-link">
                        <i className="bi bi-envelope me-2"></i>
                        {value}
                    </a>
                ) : (
                    <span className="text-muted">—</span>
                ),
        },
        {
            title: "Mobile",
            dataIndex: "MobileNumber",
            width: 160,
            render: (value) =>
                value ? (
                    <a href={`tel:${value}`} className="cfm-link">
                        <i className="bi bi-telephone me-2"></i>
                        {value}
                    </a>
                ) : (
                    <span className="text-muted">—</span>
                ),
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
            width: 120,
            align: "center",
            className: "cfm-status-cell",
            render: (_value, record) => <RowActions record={record} />,
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
                            Customers
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
                            <li className="breadcrumb-item text-muted">Customers</li>
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
                                <span>Register Customer</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= CONTENT ================= */}

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl">

                    <div className="cfm-card">

                        {/* ---- Card header ---- */}

                        <div className="cfm-card-head">
                            <div className="cfm-card-lead">
                                <span className="cfm-card-badge">
                                    <i className="bi bi-people-fill text-white"></i>
                                </span>

                                <div>
                                    <h3 className="cfm-card-title">Customer Directory</h3>
                                    <div className="cfm-card-sub">
                                        {loading
                                            ? "Loading…"
                                            : `${filtered.length} of ${customers.length} customer${
                                                  customers.length === 1 ? "" : "s"
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
                                        { value: "all", label: `All ${customers.length}` },
                                        { value: "active", label: `Active ${activeCount}` },
                                        {
                                            value: "inactive",
                                            label: `Inactive ${customers.length - activeCount}`,
                                        },
                                    ]}
                                />

                                <Input
                                    allowClear
                                    size="large"
                                    className="cfm-search"
                                    placeholder="Search name, contact, email or mobile"
                                    prefix={<i className="bi bi-search" />}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />

                                <Tooltip title="Refresh">
                                    <button
                                        type="button"
                                        className="cfm-icon-btn refresh"
                                        onClick={fetchCustomers}
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

                        {/* ---- Desktop: table ---- */}

                        <div className="d-none d-md-block cfm-table-wrap">
                            <Table
                                rowKey={(record) => record.Id}
                                columns={columns}
                                dataSource={filtered}
                                loading={loading}
                                size="middle"
                                scroll={{ x: 1030 }}
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
                                                search || statusFilter !== "all"
                                                    ? "No customer matches these filters"
                                                    : "No customers yet"
                                            }
                                        />
                                    ),
                                }}
                            />
                        </div>

                        {/* ---- Mobile: cards ----
                             A six-column table on a phone is a horizontal
                             scroll nobody uses, so the same rows are stacked
                             instead. */}

                        <div className="d-block d-md-none cfm-mobile-list">
                            {!loading && filtered.length === 0 && (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        search || statusFilter !== "all"
                                            ? "No customer matches these filters"
                                            : "No customers yet"
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
                                    <div className="d-flex align-items-center">
                                        <CustomerLogo record={record} size={44} />

                                        <div className="ms-3 flex-grow-1 min-w-0">
                                            <div className="cfm-cell-title text-truncate">
                                                {record.CustomerName}
                                            </div>
                                            <div className="cfm-cell-sub text-truncate">
                                                {record.ContactPerson || "No contact person"}
                                            </div>
                                        </div>

                                        <RowActions record={record} />
                                    </div>

                                    <div className="cfm-mobile-meta">
                                        {record.MobileNumber && (
                                            <a
                                                href={`tel:${record.MobileNumber}`}
                                                className="cfm-chip"
                                            >
                                                <i className="bi bi-telephone"></i>
                                                {record.MobileNumber}
                                            </a>
                                        )}

                                        {record.Email && (
                                            <a
                                                href={`mailto:${record.Email}`}
                                                className="cfm-chip"
                                            >
                                                <i className="bi bi-envelope"></i>
                                                <span className="text-truncate">
                                                    {record.Email}
                                                </span>
                                            </a>
                                        )}
                                    </div>

                                    {record.Address && (
                                        <div className="cfm-mobile-address">
                                            <i className="bi bi-geo-alt me-1"></i>
                                            {record.Address}
                                        </div>
                                    )}

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

            {/* ================= ADD / EDIT PANEL ================= */}

            {modalHolder}

            <RegisterCustomer
                offcanvasId={OFFCANVAS_ID}
                customer={editingCustomer}
                orgId={sessionUserData?.OrgId}
                userId={sessionUserData?.Id}
                onSaved={fetchCustomers}
            />

            {/* ================= LOGO — large view ================= */}

            <Modal
                open={Boolean(logoPreview)}
                onCancel={() => setLogoPreview(null)}
                footer={null}
                centered
                width={560}
                destroyOnHidden
                className="cfm-logo-modal"
                title={null}
            >
                {logoPreview && (
                    <div className="cfm-logo-view">
                        <div className="cfm-logo-stage">
                            {previewSrc && !brokenLogos[logoPreview.Id] ? (
                                <img
                                    src={previewSrc}
                                    alt={logoPreview.CustomerName}
                                    onError={() => markBroken(logoPreview)}
                                />
                            ) : (
                                <span className="cfm-logo-stage-fallback">
                                    {initials(logoPreview.CustomerName)}
                                    <small>Logo couldn't be loaded</small>
                                </span>
                            )}
                        </div>

                        <div className="cfm-logo-info">
                            <div className="min-w-0">
                                <div className="cfm-logo-name">{logoPreview.CustomerName}</div>
                                <div className="cfm-logo-sub">
                                    {logoPreview.ContactPerson && (
                                        <span>
                                            <i className="bi bi-person me-1"></i>
                                            {logoPreview.ContactPerson}
                                        </span>
                                    )}
                                    {logoPreview.Email && (
                                        <span>
                                            <i className="bi bi-envelope me-1"></i>
                                            {logoPreview.Email}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {previewSrc && !brokenLogos[logoPreview.Id] && (
                                <a
                                    href={previewSrc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cfm-logo-open"
                                >
                                    <i className="bi bi-box-arrow-up-right me-2"></i>
                                    Open full size
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ================= STYLES ================= */}

            <style>{`

                /* ----- Add button ----- */

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

                .cfm-btn-add:active { transform: translateY(0); }


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

                .cfm-search {
                    width: 320px;
                    border-radius: 11px;
                    border-color: #dfe6ef;
                    background: #fbfcfe;
                }

                .cfm-search .bi { color: #9aa6b4; }

                .cfm-search:hover { border-color: #b9cbe0; }


                /* ----- Table ----- */

                .cfm-table-wrap { padding: 6px 10px 10px; }

                .cfm-table-wrap .ant-table {
                    background: transparent;
                    font-size: 13.5px;
                }

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

                .cfm-table-wrap .ant-table-tbody > tr:hover > td {
                    background: #f8fbff;
                }

                .cfm-serial {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 26px;
                    height: 24px;
                    padding: 0 7px;
                    border-radius: 7px;
                    background: #f1f5fa;
                    color: #7a8795;
                    font-size: 12px;
                    font-weight: 600;
                }

                .cfm-cell-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #12263f;
                    line-height: 1.3;
                }

                .cfm-cell-sub {
                    margin-top: 2px;
                    font-size: 12px;
                    color: #8190a0;
                }

                .cfm-contact { color: #46566a; font-weight: 500; }
                .cfm-contact .bi { color: #9aa6b4; }

                .cfm-link {
                    color: #46566a;
                    text-decoration: none;
                    transition: color .15s ease;
                }

                .cfm-link .bi { color: #9aa6b4; }

                .cfm-link:hover { color: #0271ae; }
                .cfm-link:hover .bi { color: #0271ae; }


                /* ----- Logo ----- */

                .cfm-logo {
                    position: relative;
                    flex: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    border-radius: 12px;
                    overflow: hidden;
                }

                .cfm-logo.initials {
                    color: #ffffff;
                    font-weight: 700;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 6px 14px rgba(2, 113, 174, 0.20);
                }

                .cfm-logo.has-img {
                    border: 1px solid #e6edf5;
                    background: #ffffff;
                    cursor: zoom-in;
                    box-shadow: 0 6px 14px rgba(22, 50, 80, 0.07);
                    transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
                }

                .cfm-logo.has-img img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    padding: 4px;
                }

                .cfm-logo.has-img:hover,
                .cfm-logo.has-img:focus-visible {
                    transform: scale(1.06);
                    border-color: #9fc9e6;
                    box-shadow: 0 10px 20px rgba(2, 113, 174, 0.22);
                    outline: none;
                }

                .cfm-logo-zoom {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ffffff;
                    font-size: 14px;
                    background: rgba(2, 60, 100, .45);
                    opacity: 0;
                    transition: opacity .18s ease;
                }

                .cfm-logo.has-img:hover .cfm-logo-zoom,
                .cfm-logo.has-img:focus-visible .cfm-logo-zoom { opacity: 1; }


                /* ----- Logo modal ----- */

                .cfm-logo-modal .ant-modal-content,
                .cfm-logo-modal .ant-modal-container {
                    padding: 0;
                    overflow: hidden;
                    border-radius: 20px;
                }

                .cfm-logo-modal .ant-modal-body { padding: 0; }

                .cfm-logo-modal .ant-modal-close {
                    top: 14px;
                    right: 14px;
                    z-index: 2;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, .9);
                    box-shadow: 0 4px 12px rgba(15, 23, 42, .12);
                }

                .cfm-logo-stage {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 340px;
                    padding: 36px;
                    background-color: #f6f9fc;
                    background-image:
                        linear-gradient(45deg, #eef3f8 25%, transparent 25%),
                        linear-gradient(-45deg, #eef3f8 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, #eef3f8 75%),
                        linear-gradient(-45deg, transparent 75%, #eef3f8 75%);
                    background-size: 22px 22px;
                    background-position: 0 0, 0 11px, 11px -11px, -11px 0;
                }

                .cfm-logo-stage img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    filter: drop-shadow(0 12px 24px rgba(15, 23, 42, .14));
                    animation: cfmLogoIn .35s cubic-bezier(.2, .8, .2, 1);
                }

                @keyframes cfmLogoIn {
                    from { opacity: 0; transform: scale(.92); }
                    to   { opacity: 1; transform: scale(1); }
                }

                .cfm-logo-stage-fallback {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    width: 150px;
                    height: 150px;
                    border-radius: 32px;
                    color: #ffffff;
                    font-size: 46px;
                    font-weight: 800;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                }

                .cfm-logo-stage-fallback small {
                    font-size: 11px;
                    font-weight: 600;
                    opacity: .85;
                }

                .cfm-logo-info {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                    flex-wrap: wrap;
                    padding: 18px 22px;
                    border-top: 1px solid #eef3f8;
                }

                .cfm-logo-name {
                    font-size: 17px;
                    font-weight: 700;
                    color: #12263f;
                }

                .cfm-logo-sub {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 4px 14px;
                    margin-top: 3px;
                    font-size: 12.5px;
                    color: #8190a0;
                }

                .cfm-logo-open {
                    display: inline-flex;
                    align-items: center;
                    height: 40px;
                    padding: 0 16px;
                    border-radius: 11px;
                    border: 1px solid #dfe6ef;
                    color: #0271ae;
                    font-size: 13px;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all .18s ease;
                }

                .cfm-logo-open:hover {
                    background: #0271ae;
                    border-color: #0271ae;
                    color: #ffffff;
                }


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

                .cfm-icon-btn.delete { color: #ef4444; }

                .cfm-icon-btn.delete:hover {
                    background: #ef4444;
                    border-color: #ef4444;
                    color: #ffffff;
                    transform: translateY(-1px);
                    box-shadow: 0 8px 16px rgba(239, 68, 68, 0.25);
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

                .cfm-row-inactive .cfm-cell-title { text-decoration: line-through; text-decoration-color: rgba(18, 38, 63, .35); }

                .cfm-mobile-card.is-inactive { background: #fafbfc; }

                .cfm-mobile-card.is-inactive .cfm-cell-title,
                .cfm-mobile-card.is-inactive .cfm-mobile-meta,
                .cfm-mobile-card.is-inactive .cfm-mobile-address { opacity: .55; }

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
                    display: inline-flex;
                    align-items: center;
                    max-width: 100%;
                    padding: 7px 12px;
                    border-radius: 10px;
                    background: #f6f9fc;
                    border: 1px solid #e8eef5;
                    color: #12263f;
                    font-size: 13.5px;
                    font-weight: 600;
                }

                .cfm-confirm-body p { margin: 12px 0 0; font-size: 13.5px; color: #6b7a8d; }

                .cfm-confirm .ant-modal-confirm-btns .ant-btn { height: 40px; padding: 0 20px; border-radius: 11px; font-weight: 600; }

                .cfm-confirm .cfm-confirm-ok { border: none; }

                .cfm-confirm .cfm-confirm-ok.on { background: linear-gradient(135deg, #10b981, #059669) !important; }

                .cfm-confirm .cfm-confirm-ok.off { background: linear-gradient(135deg, #fb7185, #e11d48) !important; }

                .cfm-spin {
                    display: inline-block;
                    animation: cfmSpin 1s linear infinite;
                }

                @keyframes cfmSpin { to { transform: rotate(360deg); } }


                /* ----- Mobile cards ----- */

                .cfm-mobile-list { padding: 14px; }

                .cfm-mobile-card {
                    padding: 14px;
                    border: 1px solid #eef3f8;
                    border-radius: 14px;
                    background: #ffffff;
                    box-shadow: 0 6px 16px rgba(22, 50, 80, 0.05);
                }

                .cfm-mobile-card + .cfm-mobile-card { margin-top: 12px; }

                .cfm-mobile-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 12px;
                }

                .cfm-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    max-width: 100%;
                    padding: 6px 10px;
                    border-radius: 9px;
                    background: #f4f8fc;
                    color: #46566a;
                    font-size: 12px;
                    font-weight: 500;
                    text-decoration: none;
                }

                .cfm-chip .bi { color: #0271ae; }

                .cfm-mobile-address {
                    margin-top: 10px;
                    font-size: 12px;
                    color: #8190a0;
                }


                /* ----- Phone ----- */

                @media (max-width: 767.98px) {

                    .cfm-card-head {
                        padding: 16px;
                        gap: 12px;
                    }

                    .cfm-card-tools { width: 100%; flex-wrap: wrap; }

                    .cfm-status-filter.ant-segmented { width: 100%; display: flex; }

                    .cfm-status-filter .ant-segmented-group { width: 100%; }

                    .cfm-status-filter .ant-segmented-item { flex: 1 1 0; text-align: center; }

                    .cfm-search { flex: 1 1 0; width: auto; min-width: 0; }

                    .cfm-btn-add {
                        height: 42px;
                        padding: 0 16px;
                        font-size: 12.5px;
                    }

                    .cfm-logo-stage { height: 260px; padding: 24px; }

                }

            `}</style>
        </Base1>
    );
}