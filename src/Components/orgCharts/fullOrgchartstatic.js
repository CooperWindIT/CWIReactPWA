import React, { useEffect, useState, useRef } from "react";
import { Tree, TreeNode } from "react-organizational-chart";
import { Button, Popover } from "antd";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../utils/api";
import { BASE_IMAGE_API_GET } from "../Config/Config";


const formatTree = (nodes) => {
    return nodes.map(node => ({
        id: node.Id,
        name: node.Name,
        role: node.RoleName,
        email: node.Email,
        phone: node.Phone || "",
        ImageUrl: node.ImageUrl || "",
        bgColor: node.BgColor || "",
        children: node.children ? formatTree(node.children) : []
    }));
};

const extractRoleColors = (nodes) => {
    const roleMap = {};

    const traverse = (list) => {
        list.forEach(node => {
            const roleKey = node.role?.toLowerCase();

            if (roleKey && node.bgColor && !roleMap[roleKey]) {
                roleMap[roleKey] = node.bgColor;
            }

            if (node.children?.length) {
                traverse(node.children);
            }
        });
    };

    traverse(nodes);
    return roleMap;
};

const getAllNodeIds = (nodes) => {
    let ids = [];
    nodes.forEach(node => {
        ids.push(node.id);
        if (node.children?.length) ids = ids.concat(getAllNodeIds(node.children));
    });
    return ids;
};

const chunkArray = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
    return result;
};

const CARD_H = 95;
const ROW_GAP = 8;
const STUB_W = 14;
const BRIDGE_W = 20;

const OrganizationChart = () => {
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef(null);
    const dragState = useRef({
        isDown: false,
        moved: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
    });

    const [ceoId, setCeoId] = useState(null);
    const [roleColors, setRoleColors] = useState({});
    const [zoom, setZoom] = useState(1);
    const [collapsed, setCollapsed] = useState([]);
    const [data, setData] = useState([]);
    const [sessionUserData, setSessionUserData] = useState(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
        } else {
            navigate("/");
        }
    }, [navigate]);

    const fetchOrgData = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(
                `/public/GetOrgUsers?OrgId=${sessionUserData?.OrgId}`,
                { method: "GET", headers: { "Content-Type": "application/json" } }
            );
            if (!response.ok) throw new Error("Network error");
            const res = await response.json();
            const formattedTree = formatTree(res.data);

            const apiRoleColors = extractRoleColors(formattedTree);
            setRoleColors(prev => ({
                ...prev,
                ...apiRoleColors
            }));
            setData(formattedTree);
            setCeoId(formattedTree[0]);
        } catch (error) {
            console.error("Error fetching org data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) fetchOrgData();
    }, [sessionUserData]);

    useEffect(() => {
        if (data.length > 0) {
            const managerWithChildren = [];
            const findManagers = (nodes) => {
                nodes.forEach(node => {
                    if (
                        (node.role?.toLowerCase() === "manager" ||
                            node.role?.toLowerCase() === "super admin") &&
                        node.children?.length
                    ) {
                        managerWithChildren.push(node.id);
                    }
                    if (node.children) findManagers(node.children);
                });
            };
            findManagers(data);
            setCollapsed(managerWithChildren);
        }
    }, [data]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 0);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const toggleNode = (id) => {
        setCollapsed(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const NodeCard = ({ node }) => {
        const role = node?.role?.toLowerCase?.() ?? "";
        const isCEO = node?.id === ceoId?.id;
        const isLoggedUser = node.id === sessionUserData?.Id;

        const baseColor =
            isCEO ? ceoId?.bgColor :
                role === "manager" ? roleColors.manager :
                    role === "hr" ? roleColors.hr :
                        role === "employee" ? roleColors.employee :
                            role === "security" ? roleColors.security :
                                "#6d9efa";
        const cardStyle =
            isCEO
                ? {
                    ...styles.ceoCard,
                    background: `linear-gradient(135deg, #ffffff 0%, ${baseColor} 100%)`,
                    border: `2px solid ${baseColor}`,
                }
                : role === "manager"
                    ? {
                        ...styles.managerCard,
                        background: `linear-gradient(135deg, #ffffff 0%, ${baseColor} 100%)`,
                        border: `2px solid ${baseColor}`,
                    }
                    : role === "hr"
                        ? {
                            ...styles.hrCard,
                            background: `linear-gradient(135deg, #ffffff 0%, ${baseColor} 100%)`,
                            border: `2px solid ${baseColor}`,
                        }
                        : role === "employee"
                            ? {
                                ...styles.employeeCard,
                                background: `linear-gradient(135deg, #ffffff 0%, ${baseColor} 100%)`,
                                border: `2px solid ${baseColor}`,
                            }
                            : role === "security"
                                ? {
                                    ...styles.laborCard,
                                    background: `linear-gradient(135deg, #ffffff 0%, ${baseColor} 100%)`,
                                    border: `2px solid ${baseColor}`,
                                }
                                : {
                                    ...styles.employeeCard,
                                    background: `linear-gradient(135deg, #ffffff 0%, ${baseColor} 100%)`,
                                    border: `2px solid ${baseColor}`,
                                };

        const cardClass = `org-card z-4 ${isCEO ? "ceo-card" :
            role === "manager" ? "manager-card" :
                role === "hr" ? "hrcard" :
                    role === "employee" ? "employee-card" :
                        role === "security" ? "labor-card" :
                            "employee-card"
            }`;

        return (
            <Popover trigger="hover" placement="bottom">
                <div
                    className={cardClass} style={cardStyle} onClick={(e) => {
                        e.stopPropagation();
                        if (dragState.current.moved) return;
                        toggleNode(node.id);
                    }}
                >
                    <div className="avatar-wrapper">
                        <div
                            style={{
                                ...(isCEO ? styles.ceoAvatar : styles.managerAvatar),
                                border: isLoggedUser ? "3px solid #10b981" : "3px solid rgba(100, 116, 139, 0.2)",
                                background: "linear-gradient(145deg, rgba(255,255,255,0.8), rgba(226, 232, 240, 0.5))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12), inset 0 1px 2px rgba(255,255,255,0.5)",
                                backdropFilter: "blur(10px)",
                            }}
                        >


                            {node?.ImageUrl ? (
                                <img
                                    src={`${BASE_IMAGE_API_GET}/${node?.ImageUrl}`}
                                    alt={node?.name || "User"}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        borderRadius: "50%",
                                    }}
                                />
                            ) : (
                                <i
                                    className="fa-solid fa-user"
                                    style={{
                                        fontSize: isCEO ? "38px" : "26px",
                                        color: "#0ea5e9",
                                        opacity: 0.85,
                                    }}
                                ></i>
                            )}

                        </div>

                    </div>
                    <div style={styles.name} className="d-block" title={node.name}>{node.name}</div>
                    <div style={styles.role} className="d-block" title={node.role}>{node.role}</div>
                    <div style={styles.role} className="d-block" title={node.email}>{node.email}</div>
                </div>
            </Popover >
        );
    };

    const SubChildGrid = ({ nodes, side }) => {
        const rowGroups = chunkArray(nodes, 2);
        const rowCount = rowGroups.length;
        const lineTop = CARD_H / 2;
        const lineBottom = CARD_H / 2;

        const backboneCol = (
            <div className="scg-backbone" style={{ width: STUB_W }}>
                {rowCount > 1 && (
                    <div
                        className="scg-v-line"
                        style={{ top: lineTop, bottom: lineBottom }}
                    />
                )}
                {rowGroups.map((_, i) => (
                    <div key={i} className="scg-stub-slot" style={{ height: CARD_H, marginBottom: i < rowCount - 1 ? ROW_GAP : 0 }}>
                        <div className="scg-h-stub" style={{ width: STUB_W }} />
                    </div>
                ))}
            </div>
        );

        const cardsCol = (
            <div className="scg-cards" style={{ gap: ROW_GAP }}>
                {rowGroups.map((row, i) => (
                    <div key={i} className="scg-row">
                        {row.map(sc => (
                            <div key={sc.id} style={{ position: "relative" }}>
                                <NodeCard node={sc} />
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
        return (
            <div className={`scg-wrap scg-${side}`}>
                <div className="scg-bridge" style={{ width: BRIDGE_W }} />
                {side === "right"
                    ? <>{backboneCol}{cardsCol}</>
                    : <>{cardsCol}{backboneCol}</>
                }
            </div>
        );
    };

    const renderSubChildren = (node, side = "right") => {
        if (!node || collapsed.includes(node.id) || !node.children?.length) return null;
        return node.children.length > 4
            ? <DoubleSidedLayout nodes={node.children} />
            : <SubChildGrid nodes={node.children} side={side} />;
    };

    const DoubleSidedLayout = ({ nodes }) => {
        const left = nodes.filter((_, i) => i % 2 === 0);
        const right = nodes.filter((_, i) => i % 2 !== 0);
        const rowCount = Math.max(left.length, right.length);

        return (
            <div className="double-sided-wrapper">
                <div className="ds-column ds-left">
                    {Array.from({ length: rowCount }).map((_, i) => {
                        const node = left[i];
                        const isSingle = i === rowCount - 1 && !right[i];
                        if (!node) return <div key={`el-${i}`} className="ds-cell ds-empty" />;
                        const hasChildren = node.children?.length > 0;
                        const subContent = renderSubChildren(node, "left");
                        return (
                            <div key={node.id} className={`ds-cell ${isSingle ? "" : ""}`}>
                                {subContent && (
                                    <div className="ds-sub-abs ds-sub-abs-left">{subContent}</div>
                                )}
                                <div className="ds-node-wrap">
                                    {hasChildren && collapsed.includes(node.id) && (
                                        <div className="child-count-badge">{node.children.length}</div>
                                    )}
                                    <NodeCard node={node} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="ds-backbone" />

                <div className="ds-column ds-right">
                    {Array.from({ length: rowCount }).map((_, i) => {
                        const node = right[i];
                        if (!node) return <div key={`er-${i}`} className="ds-cell ds-empty" />;
                        const hasChildren = node.children?.length > 0;
                        const subContent = renderSubChildren(node, "right");
                        return (
                            <div key={node.id} className="ds-cell">
                                <div className="ds-node-wrap">
                                    {hasChildren && collapsed.includes(node.id) && (
                                        <div className="child-count-badge">{node.children.length}</div>
                                    )}
                                    <NodeCard node={node} />
                                </div>
                                {subContent && (
                                    <div className="ds-sub-abs ds-sub-abs-right">{subContent}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderTree = (nodes) => {
        if (!nodes) return null;
        return nodes.map(node => {
            const hasChildren = node.children?.length > 0;
            const isVertical = node.children?.length > 4;
            const visibleChildren =
                !collapsed.includes(node.id) && hasChildren
                    ? (
                        isVertical
                            ? <TreeNode label={<DoubleSidedLayout nodes={node.children} />} />
                            : renderTree(node.children)
                    )
                    : null;

            return (
                <TreeNode
                    key={node.id}
                    label={
                        <div style={{ marginTop: "30px", position: "relative", display: "inline-block" }}>
                            {hasChildren && collapsed.includes(node.id) && (
                                <div className="child-count-badge">{node.children.length}</div>
                            )}
                            <NodeCard node={node} toggleNode={toggleNode} />
                        </div>
                    }
                >
                    {visibleChildren}
                </TreeNode>
            );
        });
    };

    const toggleExpandCollapse = () => {
        collapsed.length === 0
            ? setCollapsed(getAllNodeIds(data))
            : setCollapsed([]);
    };

    if (loading) {
        return (
            <div
                className="position-fixed top-0 start-0 w-100 vh-100 d-flex justify-content-center align-items-center"
                style={{
                    zIndex: 9999,
                    background: "linear-gradient(135deg, rgba(241,248,255,0.96), rgba(255,255,255,0.98))",
                    backdropFilter: "blur(6px)",
                }}
            >
                <div
                    className="text-center bg-white rounded-4 shadow-lg border px-5 py-4"
                    style={{ minWidth: "320px", maxWidth: "420px" }}
                >
                    <div className="d-flex justify-content-center mb-3">
                        <div
                            className="rounded-circle d-flex align-items-center justify-content-center bg-light-primary shadow-sm"
                            style={{ width: "74px", height: "74px" }}
                        >
                            <div
                                className="spinner-border text-primary"
                                style={{ width: "2.6rem", height: "2.6rem" }}
                                role="status"
                            >
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    </div>

                    <h5 className="fw-bold text-dark mb-2">Loading Organization Chart</h5>
                    <div className="text-muted fs-7 mb-3">
                        Preparing hierarchy, relationships, and reporting structure...
                    </div>

                    <div className="d-flex justify-content-center align-items-center gap-2 mb-3">
                        <span className="badge bg-light-primary text-primary px-3 py-2 rounded-pill">
                            Please wait
                        </span>
                    </div>

                    <div className="d-flex justify-content-center gap-2">
                        <span className="bg-primary rounded-circle opacity-75" style={{ width: "10px", height: "10px", animation: "pulseDot 1.2s infinite" }}></span>
                        <span className="bg-primary rounded-circle opacity-50" style={{ width: "10px", height: "10px", animation: "pulseDot 1.2s infinite 0.2s" }}></span>
                        <span className="bg-primary rounded-circle opacity-25" style={{ width: "10px", height: "10px", animation: "pulseDot 1.2s infinite 0.4s" }}></span>
                    </div>
                </div>

                <style>
                    {`
                        @keyframes pulseDot {
                            0%, 80%, 100% {
                                transform: scale(0.8);
                                opacity: 0.35;
                            }
                            40% {
                                transform: scale(1.2);
                                opacity: 1;
                            }
                        }
                    `}
                </style>
            </div>
        );
    }


    return (
        <div style={styles.wrapper} >
            <div className="d-flex justify-content-end my-3 me-5 ">
                <button
                    type="button"
                    className="btn btn-secondary btn-sm shadow-sm d-inline-flex align-items-center gap-2"
                    onClick={() => navigate(-1)}
                >
                    <i className="bi bi-arrow-left"></i>
                    Back
                </button>
            </div>

            <div className="org-chart-scope h-100 d-flex flex-column">
                <div className="org-page-bg-logo" />

                <div className="controls">
                    <button className="zoom-btn" onClick={() => setZoom(z => z + 0.1)}>+</button>
                    <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>-</button>
                    <button className="zoom-btn" onClick={toggleExpandCollapse}>⛶</button>
                </div>

                <div
                    ref={dragRef}
                    className={`org-tree-wrapper flex-grow-1 ${isDragging ? "dragging" : ""}`}
                    onMouseDown={(e) => {
                        const el = dragRef.current;
                        if (!el) return;

                        dragState.current = {
                            isDown: true,
                            moved: false,
                            startX: e.pageX,
                            startY: e.pageY,
                            scrollLeft: el.scrollLeft,
                            scrollTop: el.scrollTop,
                        };
                    }}
                    onMouseMove={(e) => {
                        const el = dragRef.current;
                        if (!el || !dragState.current.isDown) return;

                        const dx = e.pageX - dragState.current.startX;
                        const dy = e.pageY - dragState.current.startY;

                        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                            dragState.current.moved = true;
                            setIsDragging(true);
                        }

                        if (dragState.current.moved) {
                            el.scrollLeft = dragState.current.scrollLeft - dx;
                            el.scrollTop = dragState.current.scrollTop - dy;
                        }
                    }}
                    onMouseUp={() => {
                        dragState.current.isDown = false;
                        setTimeout(() => setIsDragging(false), 0);
                    }}
                    onMouseLeave={() => {
                        dragState.current.isDown = false;
                        setIsDragging(false);
                    }}
                >

                    <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", paddingBottom: "60px" }}>
                        <Tree lineWidth="2px" lineColor="#999" lineBorderRadius="8px" label={<div />} nodePadding="8px">
                            {renderTree(data)}
                        </Tree>
                    </div>
                </div>
            </div>

            <style>
                {`
                .org-chart-scope {
                    position: relative;
                    height: 100%;
                    overflow: hidden;
                    background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f0f4f8 100%);
                }

                .org-page-bg-logo {
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    z-index: 0;
                    opacity: 0.06;
                    background-image: url("${BASE_IMAGE_API_GET}${sessionUserData?.ImageUrl}");
                    background-size: 67%;
                    background-repeat: no-repeat;
                    background-position: center center;
                    filter: blur(3px);
                }

                /* HEADING ANIMATION */
                .org-chart-scope .org-heading {
                    font-size: 32px;
                    font-weight: 700;
                    color: #0b4da2;
                    letter-spacing: 1px;
                    animation: orgHeadingSlide 0.8s ease;
                }
                @keyframes orgHeadingSlide {
                    from { opacity: 0; transform: translateY(-20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }

                .org-chart-scope .org-tree-wrapper {
                    position: relative;
                    z-index: 1;
                    flex: 1;
                    overflow: auto;
                    padding: 20px 24px 40px;
                    cursor: grab;
                    user-select: none;
                }

                .org-chart-scope .org-tree-wrapper.dragging {
                    cursor: grabbing;
                }

                /* CHILD COUNT BADGE */
                .org-chart-scope .child-count-badge {
                    position: absolute;
                    bottom: -40px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
                    border: 1.5px solid rgba(6, 182, 212, 0.3);
                    border-radius: 10px;
                    font-size: 12px;
                    padding: 5px 10px;
                    font-weight: 700;
                    box-shadow: 0 8px 20px rgba(6, 182, 212, 0.25);
                    z-index: 2;
                    color: #fff;
                    backdrop-filter: blur(10px);
                    letter-spacing: 0.5px;
                }

                /* ORG TREE WRAPPER */
                .org-chart-scope .org-tree-wrapper {
                    width: 100%;
                    overflow-x: auto;
                    padding: 40px 20px 0 40px;
                    position: relative;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(71, 85, 105, 0.3) transparent;
                }
                .org-chart-scope .org-tree-wrapper::-webkit-scrollbar {
                    height: 8px;
                }
                .org-chart-scope .org-tree-wrapper::-webkit-scrollbar-track {
                    background: transparent;
                }
                .org-chart-scope .org-tree-wrapper::-webkit-scrollbar-thumb {
                    background: rgba(71, 85, 105, 0.3);
                    border-radius: 4px;
                }
                .org-chart-scope .org-tree-wrapper::-webkit-scrollbar-thumb:hover {
                    background: rgba(71, 85, 105, 0.5);
                }
                .org-chart-scope .org-tree-wrapper .react-organizational-chart {
                    display: inline-block;
                    min-width: max-content;
                }

                /* CONTROLS */
                .org-chart-scope .controls {
                    position: fixed;
                    bottom: 30px;
                    left: 30px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    z-index: 1000;
                    filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
                }

                .org-chart-scope .org-header-fixed d-flex justify-content-center {
                    padding: 28px 20px;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
                }

                .org-chart-scope .org-header-card {
                    background: rgba(255, 255, 255, 0.85) !important;
                    border: 1.5px solid rgba(148, 163, 184, 0.25) !important;
                    max-width: 650px;
                    margin: 0 auto;
                    backdrop-filter: blur(12px);
                    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08) !important;
                    padding: 45px !important;
                    border-radius: 24px !important;
                }

                .org-chart-scope .org-header-card .bg-primary-subtle {
                    background: linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(34, 211, 238, 0.08) 100%) !important;
                    border: 1px solid rgba(6, 182, 212, 0.2) !important;
                }

                .org-chart-scope .org-header-card h1 {
                    color: #0f172a !important;
                    letter-spacing: -0.5px;
                    font-weight: 800;
                    background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                .org-chart-scope .org-header-card .text-muted {
                    color: #64748b !important;
                    font-size: 15px !important;
                }

                .org-chart-scope .org-header-card .text-primary {
                    color: #0ea5e9 !important;
                }

                .org-chart-scope .org-header-card .bg-primary {
                    background: #06b6d4 !important;
                }

                .org-chart-scope .org-header-card .flex-grow-1 {
                    background: rgba(6, 182, 212, 0.2) !important;
                }

                /* CONNECTOR LINES */
                .org-chart-scope .react-organizational-chart ul {
                    padding-top: 20px;
                }
                .org-chart-scope .react-organizational-chart li {
                    padding: 0 20px;
                    text-align: center;
                    list-style-type: none;
                    position: relative;
                }

                /* CONNECTOR LINE FIXES */
                 .org-chart-scope .react-organizational-chart li:last-child::after,
                .org-chart-scope .react-organizational-chart li:first-child::before,
                .org-chart-scope .react-organizational-chart li:only-child::before,
                .org-chart-scope .react-organizational-chart li:only-child::after,
                .org-chart-scope .react-organizational-chart li:not(:has(ul))::before,
                .org-chart-scope .react-organizational-chart li:not(:has(ul))::after,
                .org-chart-scope .react-organizational-chart li:not(:has(ul)) > div::after {
                    display: none !important;
                    border: none !important;
                }
                .org-chart-scope .no-children-node + ul::before {
                    display: none !important;
                }

                /* Update connector line colors to light theme */
                .org-chart-scope .react-organizational-chart [style*="border-left"] {
                    border-left-color: rgba(203, 213, 225, 0.5) !important;
                }
                .org-chart-scope .react-organizational-chart [style*="border-top"] {
                    border-top-color: rgba(203, 213, 225, 0.5) !important;
                }

                /* ZOOM BUTTON */
                .org-chart-scope .zoom-btn {
                    width: 52px;
                    height: 52px;
                    border-radius: 14px;
                    border: none;
                    background:  #0b1f3a;
                    color: white;
                    font-size: 20px;
                    font-weight: 600;
                    cursor: pointer;
                    box-shadow: 0 12px 28px #0b1f3a);
                    transition: all 0.28s cubic-bezier(0.4, 0.0, 0.2, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                    border: 1px solid #0b1f3a66;
                }
                .org-chart-scope .zoom-btn:hover {
                    transform: translateY(-3px) scale(1.08);
                    background: #12305a;
                    box-shadow: 0 18px 40px #12305a66;
                }
                .org-chart-scope .zoom-btn:active {
                    transform: translateY(-1px) scale(0.97);
                }

                /* ORG CARD */
                .org-chart-scope .org-card {
                    transition: all 0.35s cubic-bezier(0.4, 0.0, 0.2, 1);
                    cursor: pointer;
                    position: relative;
                }
                .org-chart-scope .org-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%);
                    opacity: 0;
                    transition: opacity 0.35s ease;
                    pointer-events: none;
                    border-radius: 18px;
                }
                .org-chart-scope .org-card:hover {
                    box-shadow: 0 30px 60px rgba(15, 23, 42, 0.15);
                    transform: translateY(-5px);
                }
                .org-chart-scope .org-card:hover::before {
                    opacity: 1;
                }
                .org-chart-scope .avatar-wrapper {
                    position: absolute;
                    left: 50%;
                    top: -2px;
                    transform: translateX(-50%);
                    transition: transform 0.35s cubic-bezier(0.4, 0.0, 0.2, 1);
                }
                .org-chart-scope .org-card:hover .avatar-wrapper {
                    transform: translateX(-50%) scale(1.18);
                }

                /* DOUBLE-SIDED VERTICAL LAYOUT */
                .org-chart-scope .double-sided-wrapper {
                    display: flex;
                    flex-direction: row;
                    align-items: flex-start;
                    justify-content: center;
                    gap: 20px;
                    position: relative;
                }
                .org-chart-scope .ds-backbone {
                    width: 1.5px;
                    align-self: stretch;
                    background: #999;
                    flex-shrink: 0;
                    z-index: 1;
                    box-shadow: 0 0 12px rgba(6, 182, 212, 0.15);
                }
                .org-chart-scope .ds-column {
                    display: flex;
                    flex-direction: column;
                    gap: 56px;
                    width: 200px;
                    flex-shrink: 0;
                }
                .org-chart-scope .ds-left  { align-items: flex-end; }
                .org-chart-scope .ds-right { align-items: flex-start; }

                .org-chart-scope .ds-cell {
                    display: flex;
                    align-items: center;
                    position: relative;
                    min-height: 120px;
                    width: 200px;
                }
                .org-chart-scope .ds-left  .ds-cell { justify-content: flex-end; }
                .org-chart-scope .ds-right .ds-cell { justify-content: flex-start; }

                .org-chart-scope .ds-empty {
                    min-height: 120px;
                    width: 200px;
                    visibility: hidden;
                }
                .org-chart-scope .ds-cell-odd { justify-content: center !important; }

                .org-chart-scope .ds-node-wrap {
                    position: relative;
                    flex-shrink: 0;
                }
                .org-chart-scope .ds-left .ds-cell .ds-node-wrap::after {
                    content: '';
                    position: absolute;
                    right: -20px;
                    top: 50%;
                    width: 20px;
                    height: 2px;
                    background: #999;
                    transform: translateY(-50%);
                    }
                    .org-chart-scope .ds-right .ds-cell .ds-node-wrap::before {
                        content: '';
                        position: absolute;
                        left: -20px;
                        top: 50%;
                        width: 20px;
                        height: 2px;
                        background: #999;
                        transform: translateY(-50%);
                    }
                .org-chart-scope .ds-sub-abs {
                    position: absolute;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 10;
                    display: flex;
                    align-items: center;
                }
                .org-chart-scope .ds-sub-abs-right { left: calc(180px + 20px); }
                .org-chart-scope .ds-sub-abs-left  { right: calc(180px); }

                /* SUB-CHILD GRID */
                .org-chart-scope .scg-wrap {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    position: relative;
                    left: -20px;
                }
                .org-chart-scope .scg-bridge {
                    height: 2px;
                    background: linear-gradient(to right, rgba(203, 213, 225, 0.5), transparent);
                    flex-shrink: 0;
                    align-self: center;
                }
                .org-chart-scope .scg-backbone {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    position: relative;
                    flex-shrink: 0;
                    align-self: stretch;
                }
                .org-chart-scope .scg-v-line {
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 2px;
                    background: linear-gradient(to bottom, rgba(203, 213, 225, 0.5), rgba(203, 213, 225, 0.1));
                }
                .org-chart-scope .scg-stub-slot {
                    display: flex;
                    align-items: center;
                    flex-shrink: 0;
                }
                .org-chart-scope .scg-h-stub { 
                    height: 2px; 
                    Background: #999;
                }
                .org-chart-scope .scg-left .scg-h-stub { 
                        margin-left: auto;
                        Background: #999;
                }
                .org-chart-scope .scg-cards {
                    display: flex;
                    flex-direction: column;
                }
                .org-chart-scope .scg-row {
                    display: flex;
                    flex-direction: row;
                    gap: 8px;
                    align-items: center;
                }

                /* HEADING ANIMATION */
                .org-chart-scope .org-heading {
                    font-size: 32px;
                    font-weight: 700;
                    color: #0b4da2;
                    letter-spacing: 1px;
                    animation: orgHeadingSlide 0.8s ease;
                }
                @keyframes orgHeadingSlide {
                    from { opacity: 0; transform: translateY(-20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                `}
            </style>
        </div>
    );
};

/* ─────────────────────────────────────  STYLES  ───────────────────────────────────── */
const styles = {
    wrapper: {
        height: "100vh",
        overflow: "hidden",
        padding: "0",

        textAlign: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #f0f4f8 100%)",
    },

    ceoCard: {
        width: "240px", height: "140px",
        border: "2px solid #0ea5e9",
        borderRadius: "20px", paddingTop: "58px",
        boxShadow: "0 20px 50px rgba(6, 182, 212, 0.15), inset 0 1px 0 rgba(255,255,255,0.6)"
    },

    ceoAvatar: { width: "120px", height: "120px", borderRadius: "50%", position: "relative", top: "-65px" },
    managerCard: {
        width: "200px", height: "125px",
        border: "2px solid #55bcf7",
        borderRadius: "18px", padding: "42px 14px",
        boxShadow: "0 15px 40px rgba(168, 85, 247, 0.12), inset 0 1px 0 rgba(255,255,255,0.6)"
    },

    managerAvatar: { width: "75px", height: "75px", borderRadius: "50%", position: "relative", top: "-35px" },
    hrCard: {
        width: "200px", height: "125px",
        border: "2px solid #0ea5e9",
        borderRadius: "18px", padding: "42px 14px",
        boxShadow: "0 15px 40px rgba(236, 72, 153, 0.12), inset 0 1px 0 rgba(255,255,255,0.6)"
    },

    employeeCard: {
        width: "200px", height: "125px",
        border: "2px solid #06b6d4",
        borderRadius: "18px", padding: "42px 14px",
        boxShadow: "0 15px 40px rgba(6, 182, 212, 0.12), inset 0 1px 0 rgba(255,255,255,0.6)"
    },

    laborCard: {
        width: "200px", height: "125px",
        border: "2px solid #0ea5e9",
        borderRadius: "18px", padding: "42px 14px",
        boxShadow: "0 15px 40px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255,255,255,0.6)"
    },

    name: { fontWeight: "700", fontSize: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#1e293b", letterSpacing: "0.3px" },
    role: { fontSize: "12px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "3px", fontWeight: "500", lineHeight: "1.2" },
};

export default OrganizationChart;
