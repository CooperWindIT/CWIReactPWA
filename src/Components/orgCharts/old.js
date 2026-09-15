import React, { useEffect, useState, useRef } from "react";
import { Popover, Modal, Dropdown } from "antd";
import { useNavigate, Link } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { fetchWithAuth } from "../../utils/api";
import { BASE_IMAGE_API_GET } from "../Config/Config";

// Requires: npm install html2canvas jspdf xlsx exceljs
//
// `xlsx` (SheetJS) powers the plain data-table Excel export
// (handleDownloadExcel) — it's the simplest way to turn rows of data into a
// sheet, but its free/community build can't reliably write cell colors,
// borders, or merged-cell styling. `exceljs` powers the second, "visual
// chart" Excel export (handleDownloadExcelChart) for exactly that reason —
// it's the one that needs colored boxes and drawn connector lines.

// Once a node has more than this many direct reports, they're stacked in a
// vertical list (comb layout) instead of fanned out side by side. Small
// groups still fan out horizontally. This is what keeps a manager with 15
// direct reports from stretching the chart out sideways across the screen.
const MAX_HORIZONTAL_CHILDREN = 3;
// Half the height of a manager/employee card (see styles.managerCard /
// styles.employeeCard below, both 125px tall) — used to line up each
// vertical-list row's connector stub with the vertical center of its card.
const ROW_CENTER = 62;
// Vertical gap between rows in the comb/vertical-list layout (see
// .v-item's margin-top). The trunk line's ::before pseudo-element has to
// explicitly bridge this gap (see .v-item:not(:first-child)::before) —
// otherwise each row's trunk segment only spans its own box, leaving a
// visible break in the line at every row boundary.
//
// Must also be bigger than how far a card's own avatar pokes above the
// card (avatar-wrapper's -2px plus managerAvatar's own -35px = 37px — see
// .avatar-wrapper / styles.managerAvatar): with too small a gap, that
// overflow lands on top of the bridged trunk segment and visually breaks
// it right where the horizontal stub should meet the vertical line.
const V_ITEM_GAP = 44;

// Horizontal offset of the vertical-list comb's own trunk line, measured
// from the left edge of its containing column (see .fan-col.vlist-col /
// .v-item below): the column's own 20px left padding, plus another 20px
// for how far .v-item::before sits inside its box. This is NOT the same
// point as a column's horizontal center — a plain VerticalList sits flush
// against the left side of its column rather than centered — so the drop
// coming down from the bus line above has to be told to land here
// explicitly instead of using the generic centered .fan-drop behavior.
// Skipping this (i.e. reusing the centered drop) is what caused the comb's
// trunk to visually disconnect from the row above it: the drop would land
// near the column's midpoint while the actual trunk started ~40px in from
// the left, leaving a gap between them instead of one continuous line.
const V_LIST_DROP_OFFSET = 40;

// Fallback palette used whenever the service doesn't send a BgColor for a
// given role (or for the CEO node). Cards render these as a flat fill (see
// NodeCard's cardStyle below — no white-blended gradient), and these are
// deliberately light/pastel rather than bold/saturated — see isColorTooDark
// below for why a service-provided color is now held to the same standard.
// No pink/rose in this palette by request.
const STATIC_ROLE_COLORS = {
    ceo: "#bae6fd",      // light sky
    manager: "#ddd6fe",  // light violet
    hr: "#a7f3d0",       // light emerald (not pink)
    employee: "#a5f3fc", // light cyan
    security: "#fde68a", // light amber
    default: "#c7d2fe",  // light indigo
};

// Shown at the top of the details modal's ID-card header. Replace with your
// organization's real display name; point COMPANY_LOGO_URL at your logo
// asset and the header will render it instead of the fallback icon badge.
const COMPANY_NAME = "CWI";
const COMPANY_LOGO_URL = "";

// Darkens (negative percent, e.g. -0.55) or lightens (positive percent) a
// hex color by the given amount. Used to derive the ID-card's dark
// header/photo-backdrop/name band from the same light per-role accent
// color used everywhere else (STATIC_ROLE_COLORS / the service's BgColor),
// so the whole badge stays in one hue family instead of introducing a new
// fixed brand color.
const shadeColor = (hex, percent) => {
    const clean = (hex || "#64748b").replace("#", "");
    const normalized = clean.length === 3
        ? clean.split("").map(c => c + c).join("")
        : clean;
    const num = parseInt(normalized, 16);
    const t = percent < 0 ? 0 : 255;
    const p = Math.abs(percent);
    const r = num >> 16;
    const g = (num >> 8) & 0x00ff;
    const b = num & 0x0000ff;
    const blended = (
        0x1000000 +
        (Math.round((t - r) * p) + r) * 0x10000 +
        (Math.round((t - g) * p) + g) * 0x100 +
        (Math.round((t - b) * p) + b)
    ).toString(16).slice(1);
    return `#${blended}`;
};

// True when a hex color is bold/saturated enough that it wouldn't read as
// "light" next to the rest of the chart (and wouldn't give the dark card
// text enough contrast either). Used to skip an overly-dark/saturated
// service-provided BgColor in favor of STATIC_ROLE_COLORS, so every role
// stays as light as the rest of the chart even when the underlying HR data
// hasn't been given a pastel color yet — while still honoring a genuinely
// light color the service does provide.
const isColorTooDark = (hex) => {
    const clean = (hex || "").replace("#", "");
    if (clean.length !== 3 && clean.length !== 6) return true; // nothing usable → needs the fallback
    const normalized = clean.length === 3
        ? clean.split("").map(c => c + c).join("")
        : clean;
    const num = parseInt(normalized, 16);
    const r = num >> 16;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    // Perceived luminance (ITU-R BT.601) — pastels sit high on this scale.
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.72;
};

// Picks `candidate` only when it's a real, sufficiently light color;
// otherwise falls back to a guaranteed-light default.
const pickLightColor = (candidate, fallback) =>
    candidate && !isColorTooDark(candidate) ? candidate : fallback;

// Sorts manager-role siblings by department name (ascending), leaving any
// non-manager siblings exactly where they were. Comparisons only produce a
// real ordering when both sides are managers — every other pair reports
// "equal" — so with a stable sort (guaranteed by the spec since ES2019)
// non-managers never move and managers interleave only among themselves.
const sortManagersByDept = (nodes) => {
    const isManager = (n) => (n.role || "").toLowerCase() === "manager";
    if (!nodes.some(isManager)) return nodes;

    return [...nodes].sort((a, b) => {
        if (!isManager(a) || !isManager(b)) return 0;
        return (a.dept || "").localeCompare(b.dept || "", undefined, { sensitivity: "base" });
    });
};

// True when a manager's direct reports don't all share one department —
// e.g. a Production manager whose team splits into Welding & NDT / Sales /
// Stores / Quality / Design & NPD / Production. This is the trigger for
// inserting a synthetic department tier between that manager and their
// people (see buildDeptNodes + HierarchyNode): a team with just one
// department keeps today's plain layout, one with several gets a
// department box per group, matching a physical org chart.
const hasMultipleDepts = (nodes) => {
    const depts = new Set(nodes.map(n => n.dept || "").filter(Boolean));
    return depts.size > 1;
};

// DeptName can encode a department that itself has sub-departments by
// separating the levels with "/" — e.g. "Production / Welding & NDT" for
// someone in Production's Welding & NDT team, vs. a flat "Sales" for a
// department with no further breakdown. This splits that path into its
// segments; a name with no "/" is just a one-segment (leaf) path.
const getDeptSegments = (deptString) =>
    (deptString || "Unassigned").split("/").map(s => s.trim()).filter(Boolean);

// A fixed set of distinct, mid-tone colors used only to border a card by
// department — separate from STATIC_ROLE_COLORS, which colors a card's
// fill by role. No pink/rose here either, matching the fill palette's
// exclusion of it.
const DEPT_BORDER_PALETTE = [
    "#0ea5e9", "#f97316", "#16a34a", "#7c3aed",
    "#dc2626", "#0891b2", "#ca8a04", "#4338ca",
    "#059669", "#78716c",
];

// Deterministic color for a given department string, so every card in that
// department — and the department box itself, since both a NodeCard and a
// DeptNodeCard call this with their own `dept` field — always gets the same
// border color without maintaining an explicit name→color map by hand.
// Deliberately keyed on whatever `dept` string is actually on the node
// rather than the full "/"-delimited path: buildDeptNodes rewrites a
// person's `dept` down to just the remaining tail as it recurses into a
// sub-department (see buildDeptNodes), so this naturally colors a person to
// match their own *immediate* department box — Production's direct staff
// match the Production box, while someone in Production's Welding & NDT
// sub-team matches that sub-box's own color instead, which is a finer,
// still-useful distinction rather than a bug.
const getDeptBorderColor = (deptString) => {
    if (!deptString) return null;
    let hash = 0;
    for (let i = 0; i < deptString.length; i++) {
        hash = (hash * 31 + deptString.charCodeAt(i)) >>> 0;
    }
    return DEPT_BORDER_PALETTE[hash % DEPT_BORDER_PALETTE.length];
};

// Turns a manager's flat list of direct reports into a tree of synthetic,
// name-only "department" nodes (rendered by DeptNodeCard) based on each
// person's DeptName path. Every department becomes one box; a department
// whose members all have a single-segment DeptName (Sales, Stores,
// Quality, Welding & NDT, Design & NPD, ...) gets that box with its people
// directly inside, while a department some members give a second path
// segment (Production / Welding & NDT, Production / Design & NPD, ...)
// recurses into a further department tier under that one box — so only
// Production (or whichever department the data actually splits further)
// grows an extra level, and everything else stays a single tier.
const buildDeptNodes = (nodes, parentKey) => {
    const groups = {};
    nodes.forEach(node => {
        const [head, ...rest] = getDeptSegments(node.dept);
        if (!groups[head]) groups[head] = [];
        groups[head].push(
            rest.length ? { entry: { ...node, dept: rest.join(" / ") }, isLeaf: false }
                : { entry: node, isLeaf: true }
        );
    });

    return Object.keys(groups)
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
        .map(deptName => {
            const entries = groups[deptName];
            const leafEmployees = entries.filter(e => e.isLeaf).map(e => e.entry);
            const deeperEntries = entries.filter(e => !e.isLeaf).map(e => e.entry);
            const key = `${parentKey}-${deptName}`;

            return {
                id: `deptnode-${key}`,
                isDeptNode: true,
                name: deptName,
                dept: deptName,
                children: [
                    ...(deeperEntries.length ? buildDeptNodes(deeperEntries, key) : []),
                    ...leafEmployees,
                ],
            };
        });
};

/* ───────────────────────────  EXCEL "VISUAL CHART" EXPORT  ───────────────────────────
   Everything below builds the boxes-and-connector-lines Excel export (see
   handleDownloadExcelChart), as opposed to the plain data-table export
   (flattenOrgData / handleDownloadExcel) above. It's split into two pure,
   framework-free steps so the geometry can be reasoned about on its own:
     1. buildExcelNode  — turns a formatted tree node into the same
        {isDeptNode, children, ...} shape HierarchyNode renders on screen,
        applying the exact same department-grouping rule (buildDeptNodes /
        hasMultipleDepts) so this export shows the same department tiers as
        the live chart and the PDF export, instead of a second, divergent
        idea of "the org structure".
     2. layoutExcelTree — walks that shape and assigns every node a
        (row, column) box plus a list of line segments to draw, using the
        same horizontal-fan-vs-vertical-comb choice HierarchyBranch makes
        on screen (a manager's/department's own reports always fan out; a
        larger group of individual contributors stacks in a comb instead).
        Unlike the on-screen layout, a comb here is always a single column
        — a spreadsheet has no reason to split it into two side-by-side
        columns just to save horizontal space the way the live chart does.
   Actually writing the workbook (colors, borders, text) happens in
   handleDownloadExcelChart itself, since that step needs component state
   (getBaseColor) to color each box the same way its on-screen card is
   colored. */

const isManagerRoleName = (role) => (role || "").toLowerCase() === "manager";

const buildExcelNode = (node) => {
    const hasChildren = node.children?.length > 0;
    const isManager = !node.isDeptNode && isManagerRoleName(node.role);
    const groupByDept = isManager && hasChildren && hasMultipleDepts(node.children);
    const childSource = groupByDept ? buildDeptNodes(node.children, String(node.id)) : (node.children || []);

    return {
        isDeptNode: !!node.isDeptNode,
        name: node.name,
        role: node.isDeptNode ? "" : (node.role || ""),
        dept: node.dept || "",
        // Real (non-department) nodes keep a reference back to the original
        // formatted-tree node so the render step can look up its role color
        // via getBaseColor — department nodes have no such color, they're
        // plain boxes just like on screen.
        origNode: node.isDeptNode ? null : node,
        children: childSource.map(buildExcelNode),
    };
};

// Layout geometry, in spreadsheet rows/columns (0-indexed; an offset is
// added once, when writing to the worksheet, to leave room for a title).
const XLSX_BOX_ROWS = 3;          // rows tall for one box (room for a bold name + role line)
const XLSX_BOX_COLS = 3;          // columns wide for one box
const XLSX_GAP_COLS = 1;          // gap between two horizontally-fanned siblings
const XLSX_FAN_CONNECTOR_ROWS = 2; // rows between a fanning node and its children: 1 stem + 1 bus line
const XLSX_TRUNK_COLS = 2;        // left margin reserved for a vertical comb's trunk line
const XLSX_VLIST_CONNECTOR_ROWS = 1; // rows between a comb's own box and its first item
const XLSX_VGAP_ROWS = 1;         // rows between two stacked comb items

// Recursively assigns every node a box (in `boxes`) and records the
// connector line segments needed to join it to its children (in `lines`).
// Returns this node's own subtree width/height (in columns/rows) plus the
// column its own box is centered on, so a caller laying out siblings (or a
// parent centering itself over them) knows how much space was used.
const layoutExcelTree = (node, colStart, rowStart, boxes, lines) => {
    const children = node.children || [];
    const hasChildren = children.length > 0;

    if (!hasChildren) {
        const box = { colStart, colEnd: colStart + XLSX_BOX_COLS - 1, rowStart, rowEnd: rowStart + XLSX_BOX_ROWS - 1, node };
        boxes.push(box);
        return { width: XLSX_BOX_COLS, height: XLSX_BOX_ROWS, centerCol: colStart + 1 };
    }

    // Same effective rule as HierarchyNode + HierarchyBranch combined: a
    // manager's own reports, or a department that itself splits into
    // further departments, always fan out; anything else fans out only
    // while it's small, and stacks into a comb once it isn't.
    const forceHorizontal = isManagerRoleName(node.role) || (node.isDeptNode && children.some(c => c.isDeptNode));
    const horizontal = forceHorizontal || children.length <= MAX_HORIZONTAL_CHILDREN;

    if (horizontal) {
        let cursorCol = colStart;
        const childCenters = [];
        let maxChildHeight = 0;

        children.forEach((child, i) => {
            if (i > 0) cursorCol += XLSX_GAP_COLS;
            const res = layoutExcelTree(child, cursorCol, rowStart + XLSX_BOX_ROWS + XLSX_FAN_CONNECTOR_ROWS, boxes, lines);
            childCenters.push(res.centerCol);
            cursorCol += res.width;
            maxChildHeight = Math.max(maxChildHeight, res.height);
        });

        const totalWidth = Math.max(XLSX_BOX_COLS, cursorCol - colStart);
        const ownColStart = colStart + Math.floor((totalWidth - XLSX_BOX_COLS) / 2);
        const centerCol = ownColStart + 1;
        boxes.push({ colStart: ownColStart, colEnd: ownColStart + XLSX_BOX_COLS - 1, rowStart, rowEnd: rowStart + XLSX_BOX_ROWS - 1, node });

        const stemRow = rowStart + XLSX_BOX_ROWS;
        const busRow = stemRow + 1;
        lines.push({ type: "v", col: centerCol, rowStart: stemRow, rowEnd: stemRow });
        if (childCenters.length > 1) {
            lines.push({ type: "h", row: busRow, colStart: Math.min(...childCenters), colEnd: Math.max(...childCenters) });
        } else if (childCenters[0] !== centerCol) {
            // A single child that isn't perfectly centered under its parent
            // still needs the stem to jog sideways to reach it.
            lines.push({ type: "h", row: busRow, colStart: Math.min(centerCol, childCenters[0]), colEnd: Math.max(centerCol, childCenters[0]) });
        }
        childCenters.forEach(c => lines.push({ type: "v", col: c, rowStart: busRow, rowEnd: busRow }));

        return { width: totalWidth, height: XLSX_BOX_ROWS + XLSX_FAN_CONNECTOR_ROWS + maxChildHeight, centerCol };
    }

    // Vertical comb: children stack in a single column, each hanging off a
    // shared trunk line via a short elbow — same idea as the on-screen
    // VerticalList, just without the two-column split (no reason to save
    // horizontal space in a spreadsheet the way the live chart does).
    const trunkCol = colStart;
    let cursorRow = rowStart + XLSX_BOX_ROWS + XLSX_VLIST_CONNECTOR_ROWS;
    let maxChildWidth = 0;
    let firstElbowRow = null;
    let lastElbowRow = null;

    children.forEach((child, i) => {
        if (i > 0) cursorRow += XLSX_VGAP_ROWS;
        const childColStart = trunkCol + XLSX_TRUNK_COLS;
        const res = layoutExcelTree(child, childColStart, cursorRow, boxes, lines);
        const elbowRow = cursorRow + Math.floor(XLSX_BOX_ROWS / 2);
        if (firstElbowRow === null) firstElbowRow = elbowRow;
        lastElbowRow = elbowRow;
        lines.push({ type: "h", row: elbowRow, colStart: trunkCol + 1, colEnd: childColStart - 1 });
        cursorRow += res.height;
        maxChildWidth = Math.max(maxChildWidth, res.width);
    });

    const totalWidth = XLSX_TRUNK_COLS + maxChildWidth;
    const totalHeight = cursorRow - rowStart;
    const ownColStart = colStart + Math.floor((totalWidth - XLSX_BOX_COLS) / 2);
    const centerCol = ownColStart + 1;
    boxes.push({ colStart: ownColStart, colEnd: ownColStart + XLSX_BOX_COLS - 1, rowStart, rowEnd: rowStart + XLSX_BOX_ROWS - 1, node });

    // One line from the box down into the trunk, bending sideways first if
    // the box (centered over the whole comb) doesn't sit directly above
    // the trunk column (which stays flush with the comb's left edge).
    const stemRow = rowStart + XLSX_BOX_ROWS;
    lines.push({ type: "v", col: centerCol, rowStart: stemRow, rowEnd: stemRow });
    if (centerCol !== trunkCol + 1) {
        lines.push({ type: "h", row: stemRow, colStart: Math.min(centerCol, trunkCol + 1), colEnd: Math.max(centerCol, trunkCol + 1) });
    }
    if (firstElbowRow !== null) {
        lines.push({ type: "v", col: trunkCol + 1, rowStart: stemRow, rowEnd: lastElbowRow });
    }

    return { width: totalWidth, height: totalHeight, centerCol };
};

const formatTree = (nodes) => {
    const mapped = nodes.map(node => ({
        id: node.Id,
        superiorId: node.IsSuperiorId,
        name: node.Name,
        role: node.RoleName,
        // No confirmed field name for this yet (asked, got no answer) —
        // checked defensively against the common API naming variants, and
        // falls back to RoleName so the modal's Designation row is never
        // blank even if the service turns out not to send a separate
        // field after all. If designations still look wrong once this is
        // wired to the real API, the fix is just changing the field name
        // checked here.
        designation: node.Designation || node.DesignationName || node.Designation_Name || node.RoleName || "",
        email: node.Email,
        phone: node.Phone || "",
        dept: node.DeptName || "",
        empNo: node.EmpNo || "",
        ImageUrl: node.ImageUrl || "",
        bgColor: node.BgColor || "",

        children: node.children
            ? sortManagersByDept(formatTree(node.children))
            : []
    }));

    return sortManagersByDept(mapped);
};

const extractRoleColors = (nodes) => {
    const roleMap = {};

    const traverse = (list) => {
        list.forEach(node => {
            const roleKey = node.role?.toLowerCase();

            // Skip a bold/saturated BgColor rather than adopting it for the
            // whole role — a later node of the same role with a lighter
            // color (or the STATIC_ROLE_COLORS default, since roleColors
            // state starts seeded with it) takes over instead.
            if (roleKey && node.bgColor && !roleMap[roleKey] && !isColorTooDark(node.bgColor)) {
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

// Finds the first node (depth-first) whose name or email contains `term`
// (case-insensitive) and returns the full id path from a root down to it,
// inclusive — e.g. [ceoId, managerId, employeeId]. Used by search to know
// which ancestor ids need removing from `collapsed` so the match becomes
// visible. Walks the real (data) tree only: synthetic department nodes are
// inserted at render time (see buildDeptNodes) and expand automatically
// once their real manager ancestor is expanded, so they don't need to be
// part of this path. Returns null when nothing matches.
const findNodePath = (nodes, term, path = []) => {
    for (const node of nodes) {
        const nextPath = [...path, node.id];
        const haystack = `${node.name || ""} ${node.email || ""}`.toLowerCase();
        if (haystack.includes(term)) return nextPath;
        if (node.children?.length) {
            const found = findNodePath(node.children, term, nextPath);
            if (found) return found;
        }
    }
    return null;
};

// Flattens the (already-formatted) org tree into one row per person, each
// carrying its manager's name and its depth in the hierarchy — used by the
// Excel export so the sheet reads as a normal employee list rather than a
// nested tree. Independent of the on-screen expand/collapse state: the
// export always covers every person in `data`, not just what's currently
// visible in the chart.
const flattenOrgData = (nodes, managerName = "", level = 1, rows = []) => {
    nodes.forEach(node => {
        rows.push({
            Name: node.name || "",
            Role: node.role || "",
            Designation: node.designation || "",
            Department: node.dept || "",
            Email: node.email || "",
            Phone: node.phone || "",
            "Employee No": node.empNo || "",
            "Reports To": managerName,
            Level: level,
        });

        if (node.children?.length) {
            flattenOrgData(node.children, node.name, level + 1, rows);
        }
    });

    return rows;
};

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
    // Seeded with the static fallback palette so any role the service
    // doesn't send a BgColor for still resolves to a real color. API
    // colors (see extractRoleColors + fetchOrgData below) overwrite these
    // per-role as they come in; roles missing from the response keep the
    // static default.
    const [roleColors, setRoleColors] = useState(STATIC_ROLE_COLORS);
    const [zoom, setZoom] = useState(1);
    const [collapsed, setCollapsed] = useState([]);
    const [data, setData] = useState([]);
    const [sessionUserData, setSessionUserData] = useState(null);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const [sessionActionIds, setSessionActionIds] = useState([]);

    // The node whose full details are shown in the premium details modal —
    // set when a card is clicked, cleared to close the modal.
    const [selectedNode, setSelectedNode] = useState(null);

    // PDF/Excel export: chartContentRef points at the actual chart content
    // (org-root) so html2canvas can snapshot it directly, independent of
    // the scrollable/zoomable wrapper around it. `exporting` disables the
    // export button and swaps its label while a PDF capture is in flight.
    const chartContentRef = useRef(null);
    const [exporting, setExporting] = useState(false);

    // Search: `searchTerm` is the text box value; `highlightedId` is the
    // matched node's id (drives NodeCard's search-highlight class) and also
    // the trigger for the scroll-into-view effect below; `searchNotFound`
    // shows a brief inline message when nothing matches.
    const [searchTerm, setSearchTerm] = useState("");
    const [highlightedId, setHighlightedId] = useState(null);
    const [searchNotFound, setSearchNotFound] = useState(false);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            const dashboardMenu = parsedMenu.find(
                (item) => item.MenuName === "Flow Chart"
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

            const ceo = formattedTree.find(
                node => Number(node.superiorId) === 0
            );

            setCeoId(ceo);

            // Initially collapse EVERYTHING.
            // User must click CEO first.
            setCollapsed(getAllNodeIds(formattedTree));
        } catch (error) {
            console.error("Error fetching org data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) fetchOrgData();
    }, [sessionUserData]);

    const toggleNode = (id) => {
        setCollapsed(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Shared with the details modal so the accent color on a card and the
    // banner behind its "view details" popup always agree. pickLightColor
    // is a second safety net (extractRoleColors already filters out bold
    // service colors before they ever reach roleColors) so every role ends
    // up as light as the rest of the chart regardless of what the service
    // sends.
    const getBaseColor = (node) => {
        const role = node?.role?.toLowerCase?.() ?? "";
        const isCEO = Number(node?.superiorId) === 0;

        return isCEO ? pickLightColor(ceoId?.bgColor, STATIC_ROLE_COLORS.ceo) :
            role === "manager" ? pickLightColor(roleColors.manager, STATIC_ROLE_COLORS.manager) :
                role === "hr" ? pickLightColor(roleColors.hr, STATIC_ROLE_COLORS.hr) :
                    role === "employee" ? pickLightColor(roleColors.employee, STATIC_ROLE_COLORS.employee) :
                        role === "security" ? pickLightColor(roleColors.security, STATIC_ROLE_COLORS.security) :
                            STATIC_ROLE_COLORS.default;
    };

    const NodeCard = ({ node }) => {
        const role = node?.role?.toLowerCase?.() ?? "";
        const isCEO = Number(node?.superiorId) === 0;
        const isLoggedUser = node.id === sessionUserData?.Id;

        const childCount = node?.children?.length || 0;
        const hasChildren = childCount > 0;
        const isCollapsed = collapsed.includes(node.id);

        const baseColor = getBaseColor(node);
        // Flat, direct fill — no white-blended gradient — so the role color
        // reads as a bold, solid card face. The border is a darker shade of
        // that same color rather than a fixed tone, so it stays a subtle
        // edge instead of a mismatched outline against a flat fill.
        // Department identity is now shown by the enclosing dept-group
        // frame (see FanRow/.dept-group-frame), not by tinting each card's
        // own border — an earlier attempt colored every card's border by
        // department directly, but that read as noise rather than a group;
        // see the design doc for why this was replaced.
        const cardBorderColor = shadeColor(baseColor, -0.35);
        const cardStyle =
            isCEO
                ? {
                    ...styles.ceoCard,
                    background: baseColor,
                    border: `2px solid ${cardBorderColor}`,
                }
                : role === "manager"
                    ? {
                        ...styles.managerCard,
                        background: baseColor,
                        border: `2px solid ${cardBorderColor}`,
                    }
                    : role === "hr"
                        ? {
                            ...styles.hrCard,
                            background: baseColor,
                            border: `2px solid ${cardBorderColor}`,
                        }
                        : role === "employee"
                            ? {
                                ...styles.employeeCard,
                                background: baseColor,
                                border: `2px solid ${cardBorderColor}`,
                            }
                            : role === "security"
                                ? {
                                    ...styles.laborCard,
                                    background: baseColor,
                                    border: `2px solid ${cardBorderColor}`,
                                }
                                : {
                                    ...styles.employeeCard,
                                    background: baseColor,
                                    border: `2px solid ${cardBorderColor}`,
                                };

        const cardClass = `org-card z-4 ${isCEO ? "ceo-card" :
            role === "manager" ? "manager-card" :
                role === "hr" ? "hrcard" :
                    role === "employee" ? "employee-card" :
                        role === "security" ? "labor-card" :
                            "employee-card"
            }`;

        const isHighlighted = highlightedId === node.id;

        return (
            <Popover trigger="hover" placement="bottom">
                <div
                    className={`${cardClass} ${isHighlighted ? "search-highlight" : ""}`}
                    style={cardStyle}
                    data-node-id={node.id}
                    onClick={(e) => {
                        // Clicking the card body now expands/collapses it —
                        // same action as the count badge — since a click
                        // there was previously the only way to open the
                        // details modal, which made expanding a node
                        // require the small count badge specifically.
                        // Opening the modal instead lives on the avatar
                        // image (see its own onClick below).
                        e.stopPropagation();
                        if (dragState.current.moved) return;
                        toggleNode(node.id);
                    }}
                >
                    {/* Small role-colored marker, top-left corner — the
                        same role→color mapping as the card's own border
                        (cardBorderColor), just as a compact dot so the role
                        is scannable even at a glance/zoomed-out, not only
                        from the card's own fill or its text. */}
                    <div className="role-dot" style={{ background: cardBorderColor }} title={node.role} />
                    <div
                        className="avatar-wrapper"
                        onClick={(e) => {
                            // The one place that still opens the details
                            // modal — stopPropagation keeps this from also
                            // triggering the card's own expand/collapse.
                            e.stopPropagation();
                            if (dragState.current.moved) return;
                            setSelectedNode(node);
                        }}
                    >
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
                                cursor: "pointer",
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
                    {node.dept && (
                        <div style={styles.dept} className="d-block" title={node.dept}>{node.dept}</div>
                    )}
                    <div style={styles.role} className="d-block" title={node.email}>{node.email}</div>
                    {hasChildren && (
                        <div
                            className={`children-count ${isCollapsed ? "collapsed" : "expanded"
                                }`}
                            title={`${childCount} direct ${childCount === 1 ? "child" : "children"} — click to ${isCollapsed ? "expand" : "collapse"}`}
                            onClick={(e) => {
                                // Same action as clicking the card body now
                                // (both expand/collapse) — stopPropagation
                                // just avoids double-toggling (once here,
                                // once again as the click bubbles up to the
                                // card's own handler).
                                e.stopPropagation();
                                if (dragState.current.moved) return;
                                toggleNode(node.id);
                            }}
                        >
                            {childCount}
                        </div>
                    )}
                </div>
            </Popover >
        );
    };

    const isManagerRole = (node) => (node.role || "").toLowerCase() === "manager";

    // A department box: a plain, name-only rectangle (no photo/role/email,
    // since it isn't a person) inserted between a manager and their people
    // whenever that team spans more than one department (see
    // buildDeptNodes). Clicking one only expands/collapses its own
    // children — department boxes don't open the person-details modal.
    const DeptNodeCard = ({ node }) => {
        const hasChildren = node.children?.length > 0;
        const childCount = node.children?.length || 0;
        const isCollapsed = collapsed.includes(node.id);

        return (
            <div
                className="dept-node-card"
                onClick={(e) => {
                    e.stopPropagation();
                    if (dragState.current.moved) return;
                    toggleNode(node.id);
                }}
            >
                <div className="dept-node-name" title={node.name}>{node.name}</div>
                {hasChildren && (
                    <div
                        className={`children-count ${isCollapsed ? "collapsed" : "expanded"}`}
                        title={`${childCount} direct ${childCount === 1 ? "item" : "items"} — click to ${isCollapsed ? "expand" : "collapse"}`}
                    >
                        {childCount}
                    </div>
                )}
            </div>
        );
    };

    // A single node plus (if expanded) whatever is under it. This is the
    // recursive entry point: every branch, at every depth, goes through
    // HierarchyBranch below to decide how its own children should be laid
    // out, so the same rule applies uniformly no matter how deep you go.
    //
    // A manager's own direct reports always fan out horizontally, no
    // matter how many there are or what role they hold — that's the row of
    // department/section heads you'd expect right under a manager, same as
    // the CEO's own direct reports. It's only once you're looking at the
    // reports of a non-manager (an individual contributor) that a large
    // group (more than MAX_HORIZONTAL_CHILDREN) switches to a vertical list.
    //
    // A manager whose direct reports span more than one department (e.g.
    // Production splitting into Welding & NDT / Sales / Stores / Quality /
    // Design & NPD / Production) gets a synthetic department tier inserted
    // here instead — buildDeptNodes turns the flat report list into
    // department boxes (DeptNodeCard), each holding either that
    // department's people directly, or — only where the data itself
    // encodes a further split (a "/" in DeptName) — another department
    // tier beneath it. A single-department team is untouched and renders
    // exactly as before.
    //
    // `insideDeptFrame` (default false) says whether an ancestor has
    // already wrapped this subtree in a dept-group-frame (see FanRow) — it
    // exists purely to stop a SECOND, nested frame from appearing. Without
    // it, a manager who heads one department (e.g. an "HR & Admin" manager
    // whose own reports split into "Finance" and "HR & Admin" sub-teams)
    // would independently qualify for its own frame one level down, giving
    // two nested circles where the user wants only the one outer frame
    // around the whole department family.
    const HierarchyNode = ({ node, insideDeptFrame = false }) => {
        const hasChildren = node.children?.length > 0;
        const isExpanded = !collapsed.includes(node.id);
        const isManager = isManagerRole(node);
        const groupByDept = isManager && hasChildren && hasMultipleDepts(node.children);
        // Only actually start a new frame if we're not already inside one —
        // see the note above.
        const frameChildren = groupByDept && !insideDeptFrame;
        const childInsideDeptFrame = insideDeptFrame || frameChildren;

        const childrenToRender = groupByDept
            ? buildDeptNodes(node.children, String(node.id))
            : node.children;

        // Department boxes fan out like a manager's reports do; so does a
        // department's own children when they're a further department
        // tier. Plain employees under a leaf department instead fall back
        // to the usual size-based fan/vertical-comb rule, so a large team
        // doesn't stretch one row very wide.
        const forceChildrenHorizontal = isManager
            || (node.isDeptNode && node.children?.some(c => c.isDeptNode));

        return (
            <div className="hierarchy-node">
                {node.isDeptNode ? <DeptNodeCard node={node} /> : <NodeCard node={node} />}
                {hasChildren && isExpanded && (
                    <HierarchyBranch
                        nodes={childrenToRender}
                        forceHorizontal={forceChildrenHorizontal}
                        frameDeptGroups={frameChildren}
                        insideDeptFrame={childInsideDeptFrame}
                    />
                )}
            </div>
        );
    };

    // One row of siblings, fanned out side by side under a shared bus line.
    // The bus-bar/line CSS (see .fan-col.multi) draws correctly for any
    // number of columns, so there's no cap on how many nodes this can take.
    //
    // Every column always gets its own .fan-drop, whether this row has one
    // sibling or several: .fan-col's top padding (see CSS) is the same
    // fixed amount either way, specifically so that a department with one
    // employee and a department with three fanned-out employees start
    // their card row at the exact same height below the department box.
    // Making that padding conditional on "multi" (as it used to be) is what
    // caused the zig-zag — a lone-child column had no top padding at all,
    // so its card sat noticeably higher than a neighboring column whose
    // department had several children fanning out.
    //
    // `frameDeptGroups`, when true, wraps each department-node child (and
    // everything under it) in one bordered "dept-group-frame" colored by
    // that department — this is where each of the 6 circles the user drew
    // (one per top-level department under a manager) actually comes from.
    // A non-department sibling just renders plain and passes `insideDeptFrame`
    // straight through, unaffected.
    const FanRow = ({ nodes, frameDeptGroups, insideDeptFrame }) => {
        const multi = nodes.length > 1;
        return (
            <div className={`fan-row ${multi ? "multi" : ""}`}>
                {nodes.map((node) => {
                    const wrapInFrame = frameDeptGroups && node.isDeptNode;
                    const frameColor = wrapInFrame ? getDeptBorderColor(node.dept) : null;

                    return (
                        <div key={node.id} className={`fan-col ${multi ? "multi" : ""}`}>
                            <div className="fan-drop" />
                            {frameColor ? (
                                <div className="dept-group-frame" style={{ borderColor: frameColor }}>
                                    <HierarchyNode node={node} insideDeptFrame={true} />
                                </div>
                            ) : (
                                <HierarchyNode node={node} insideDeptFrame={insideDeptFrame} />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Renders one parent's children: horizontally fanned out when the
    // parent is a manager (forceHorizontal) or when there are few enough of
    // them anyway; otherwise split into two side-by-side vertical lists —
    // each its own trunk line with rows hanging off short elbow connectors
    // — so a big team of individual contributors reads as two shorter
    // columns instead of one very long one.
    const HierarchyBranch = ({ nodes, forceHorizontal, frameDeptGroups, insideDeptFrame }) => {
        if (!nodes?.length) return null;

        if (forceHorizontal || nodes.length <= MAX_HORIZONTAL_CHILDREN) {
            return (
                <div className="branch">
                    <div className="branch-stem" />
                    <FanRow nodes={nodes} frameDeptGroups={frameDeptGroups} insideDeptFrame={insideDeptFrame} />
                </div>
            );
        }

        const mid = Math.ceil(nodes.length / 2);
        const columns = [nodes.slice(0, mid), nodes.slice(mid)];

        return (
            <div className="branch">
                <div className="branch-stem" />
                <div className="fan-row multi">
                    {columns.map((colNodes, i) => (
                        <div key={i} className="fan-col vlist-col">
                            <div className="fan-drop" />
                            <VerticalList nodes={colNodes} insideDeptFrame={insideDeptFrame} />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // The vertical "comb" list: a trunk line down the left with each row
    // hanging off it via a short horizontal stub. Each row can itself expand
    // into a further fan or vertical list underneath it (see Sakthivel's 3
    // reports fanning out under their row, for example) without disturbing
    // the trunk line, since the trunk is drawn per-row and rows simply stack.
    const VerticalList = ({ nodes, insideDeptFrame }) => (
        <div className="v-list">
            {nodes.map((node) => (
                <div key={node.id} className="v-item">
                    <div className="v-item-row">
                        <HierarchyNode node={node} insideDeptFrame={insideDeptFrame} />
                    </div>
                </div>
            ))}
        </div>
    );

    // Premium "view details" popup opened by clicking a card. Mirrors the
    // card's own accent color (via getBaseColor) so the banner behind the
    // avatar always matches the role/dept colors used across the chart.
    const DetailsModal = () => {
        const node = selectedNode;
        const open = !!node;

        // Keep the last node rendered while the close animation plays, so
        // the modal doesn't flash empty as it fades out.
        const [renderNode, setRenderNode] = useState(node);
        useEffect(() => {
            if (node) setRenderNode(node);
        }, [node]);

        if (!renderNode) return null;

        const isCEO = Number(renderNode?.superiorId) === 0;
        const baseColor = getBaseColor(renderNode);
        // The dark band color (header / photo backdrop / name plate) is
        // derived from the card's own light accent color rather than a
        // fixed brand color, so every role's badge still reads as "that
        // role's color", just in a dark/light pairing like a real ID card.
        const darkColor = shadeColor(baseColor, -0.55);

        const fields = [
            { icon: "fa-briefcase", label: "Designation", value: renderNode.designation },
            { icon: "fa-building", label: "Department", value: renderNode.dept },
            { icon: "fa-id-badge", label: "Employee No", value: renderNode.empNo },
            { icon: "fa-envelope", label: "Email", value: renderNode.email },
            { icon: "fa-phone", label: "Phone", value: renderNode.phone },
        ].filter(f => f.value);

        return (
            <Modal
                open={open}
                onCancel={() => setSelectedNode(null)}
                footer={null}
                centered
                width={340}
                className="org-detail-modal"
                closeIcon={<span className="org-detail-close">✕</span>}
            >
                <div className="idcard">
                    {/* One continuous dark panel behind the logo, photo and
                        name/role — same as the reference badge, where the
                        green background runs unbroken from the top to just
                        below the role text. */}
                    <div className="idcard-dark" style={{ background: darkColor }}>
                        <div className="idcard-header">
                            {COMPANY_LOGO_URL ? (
                                <img src={COMPANY_LOGO_URL} alt={COMPANY_NAME} className="idcard-logo-img" />
                            ) : (
                                <span className="idcard-logo-icon">
                                    <i className="fa-solid fa-building"></i>
                                </span>
                            )}
                            <span className="idcard-company">{COMPANY_NAME}</span>
                        </div>

                        {/* The light square is a fixed-size backdrop; the
                            photo itself is taller and bottom-anchored to it,
                            so a background-removed cutout (head/shoulders)
                            rises above the square into the dark area, the
                            way the reference photo does. A node with no
                            ImageUrl gets a centered fallback icon instead,
                            sized to the square rather than overflowing it. */}
                        <div className="idcard-photo-stage">
                            <div className="idcard-photo-panel" style={{ background: baseColor }} />
                            {renderNode.ImageUrl ? (
                                <div className="idcard-photo-img-wrap">
                                    <img
                                        src={`${BASE_IMAGE_API_GET}/${renderNode.ImageUrl}`}
                                        alt={renderNode.name || "User"}
                                    />
                                </div>
                            ) : (
                                <div className="idcard-photo-fallback">
                                    <i className="fa-solid fa-user" style={{ fontSize: "56px", color: darkColor, opacity: 0.5 }}></i>
                                </div>
                            )}
                        </div>

                        <div className="idcard-name-wrap">
                            <div className="idcard-name" title={renderNode.name}>{renderNode.name}</div>
                            <div className="idcard-underline" style={{ background: baseColor }} />
                            <div className="idcard-role">{isCEO ? "CEO" : renderNode.role}</div>
                        </div>
                    </div>

                    {fields.length > 0 && (
                        <div className="idcard-footer" style={{ background: baseColor, color: darkColor }}>
                            {fields.map(f => (
                                <div className="idcard-footer-row" key={f.label} title={f.value}>
                                    <span className="idcard-footer-label">{f.label}:</span> {f.value}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>
        );
    };

    const toggleExpandCollapse = () => {
        collapsed.length === 0
            ? setCollapsed(getAllNodeIds(data))
            : setCollapsed([]);
    };

    // Finds a person by name/email, expands whatever ancestors are
    // currently collapsed so the match becomes visible, then hands off to
    // the scroll-into-view effect below (triggered by highlightedId
    // changing) to actually bring it on screen and flash the highlight.
    const handleSearch = () => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return;

        const path = findNodePath(data, term);
        if (!path) {
            setSearchNotFound(true);
            setHighlightedId(null);
            return;
        }

        setSearchNotFound(false);
        const matchId = path[path.length - 1];
        const ancestorIds = path.slice(0, -1);
        setCollapsed(prev => prev.filter(id => !ancestorIds.includes(id)));
        // Re-triggers the scroll/highlight effect even for the same match
        // searched twice in a row.
        setHighlightedId(null);
        requestAnimationFrame(() => setHighlightedId(matchId));
    };

    // Runs whenever a search sets highlightedId: waits a couple of frames
    // for the newly-expanded ancestors to actually mount their DOM (the
    // collapsed-state update above and this effect can land in the same
    // tick otherwise), scrolls the matched card into view, and clears the
    // highlight itself after a few seconds so it reads as a flash rather
    // than a permanent marker.
    useEffect(() => {
        if (!highlightedId) return;

        let raf1, raf2;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                const el = dragRef.current?.querySelector(`[data-node-id="${highlightedId}"]`);
                el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
            });
        });

        const clearTimer = setTimeout(() => setHighlightedId(null), 4000);
        return () => {
            cancelAnimationFrame(raf1);
            if (raf2) cancelAnimationFrame(raf2);
            clearTimeout(clearTimer);
        };
    }, [highlightedId]);

    // Waits for every <img> under `el` to finish loading (or fail) before
    // resolving — html2canvas snapshots whatever has painted so far, so
    // without this, employee photos that haven't finished loading come out
    // blank in the exported PDF.
    const waitForImages = (el) => {
        const imgs = Array.from(el?.querySelectorAll("img") || []);
        return Promise.all(
            imgs.map(img => img.complete
                ? Promise.resolve()
                : new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                })
            )
        );
    };

    const handleDownloadPdf = async () => {
        if (!chartContentRef.current || exporting) return;

        setExporting(true);
        const prevCollapsed = collapsed;
        const prevZoom = zoom;

        // Export the whole hierarchy at natural size, regardless of what's
        // currently expanded/collapsed or zoomed on screen — the download
        // is meant to be the full org chart, not just the current view.
        setCollapsed([]);
        setZoom(1);

        try {
            // Give React two frames to re-render the expanded tree at the
            // reset zoom before we read the DOM for layout sizes.
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            await waitForImages(chartContentRef.current);

            const canvas = await html2canvas(chartContentRef.current, {
                backgroundColor: "#f8fafc",
                scale: 2, // sharper export than the on-screen CSS pixel size
                useCORS: true, // needs the image host to send CORS headers
            });

            // One page sized exactly to the chart, rather than paginating a
            // wide/tall org chart across multiple A4 sheets.
            const pdf = new jsPDF({
                orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
                unit: "px",
                format: [canvas.width, canvas.height],
            });
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width, canvas.height);
            pdf.save(`OrganizationChart_${new Date().toISOString().slice(0, 10)}.pdf`);
        } catch (error) {
            console.error("Error exporting organization chart to PDF:", error);
        } finally {
            setCollapsed(prevCollapsed);
            setZoom(prevZoom);
            setExporting(false);
        }
    };

    const handleDownloadExcel = () => {
        if (!data?.length) return;

        const rows = flattenOrgData(data);
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
            { wch: 22 }, // Name
            { wch: 16 }, // Role
            { wch: 20 }, // Designation
            { wch: 16 }, // Department
            { wch: 28 }, // Email
            { wch: 14 }, // Phone
            { wch: 14 }, // Employee No
            { wch: 22 }, // Reports To
            { wch: 8 },  // Level
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Organization Chart");
        XLSX.writeFile(workbook, `OrganizationChart_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    // The second Excel option: an actual boxes-and-connector-lines chart in
    // a worksheet (colored per-role boxes, department tiers, lines drawn
    // via cell borders), rather than a flat one-row-per-person table. Built
    // from `data` directly (not whatever's currently expanded/collapsed on
    // screen) so, like the PDF export, it always covers the whole org.
    const handleDownloadExcelChart = async () => {
        if (!data?.length || exporting) return;
        setExporting(true);

        try {
            const boxes = [];
            const lines = [];
            let cursorCol = 0;
            data.forEach((root, i) => {
                if (i > 0) cursorCol += XLSX_GAP_COLS;
                const res = layoutExcelTree(buildExcelNode(root), cursorCol, 0, boxes, lines);
                cursorCol += res.width;
            });

            const ROW_OFFSET = 2; // title row + one blank spacer row
            const COL_OFFSET = 1; // one blank column of left margin
            // Plain, light box for a department tier (see DeptNodeCard on
            // screen) — department nodes have no role color to draw from.
            const DEPT_FILL = "#e0eeff";
            const DEPT_BORDER = "#334155";
            const LINE_COLOR = "#94a3b8"; // same slate as the on-screen connector lines

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet("Organization Chart", {
                views: [{ showGridLines: false }], // gridlines would visually clash with the drawn connector lines
                pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
            });

            let maxCol = 0, maxRow = 0;
            const boxRows = new Set(), boxCols = new Set();
            boxes.forEach(b => {
                maxCol = Math.max(maxCol, b.colEnd);
                maxRow = Math.max(maxRow, b.rowEnd);
                for (let r = b.rowStart; r <= b.rowEnd; r++) boxRows.add(r);
                for (let c = b.colStart; c <= b.colEnd; c++) boxCols.add(c);
            });
            lines.forEach(l => {
                if (l.type === "v") { maxCol = Math.max(maxCol, l.col); maxRow = Math.max(maxRow, l.rowEnd); }
                else { maxCol = Math.max(maxCol, l.colEnd); maxRow = Math.max(maxRow, l.row); }
            });

            // Columns/rows that are part of a box get real width/height;
            // everything else is a gap/trunk/connector column or row and
            // stays thin, so the drawn lines read as thin connectors
            // rather than wide empty bands.
            for (let c = 0; c <= maxCol + COL_OFFSET; c++) {
                sheet.getColumn(c + 1).width = boxCols.has(c - COL_OFFSET) ? 13 : 3;
            }
            for (let r = 0; r <= maxRow + ROW_OFFSET; r++) {
                sheet.getRow(r + 1).height = boxRows.has(r - ROW_OFFSET) ? 30 : 10;
            }
            sheet.getRow(1).height = 26;

            sheet.mergeCells(1, 1, 1, maxCol + COL_OFFSET + 1);
            const titleCell = sheet.getCell(1, 1);
            titleCell.value = `${COMPANY_NAME} — Organization Chart`;
            titleCell.font = { bold: true, size: 16, color: { argb: "FF0B1F3A" } };
            titleCell.alignment = { horizontal: "center", vertical: "middle" };

            const toArgb = (hex) => `FF${(hex || "#94a3b8").replace("#", "").toUpperCase()}`;
            const thinLine = (argb) => ({ style: "thin", color: { argb } });

            // Merged cells only render an outer border when every cell
            // along that border's edge carries it — exceljs doesn't do
            // this automatically for a merged range, so each cell in the
            // box gets just the sides that fall on the box's actual edge.
            const applyBoxBorder = (rowStart, rowEnd, colStart, colEnd, argb) => {
                const style = thinLine(argb);
                for (let r = rowStart; r <= rowEnd; r++) {
                    for (let c = colStart; c <= colEnd; c++) {
                        const cell = sheet.getCell(r + ROW_OFFSET + 1, c + COL_OFFSET + 1);
                        const border = { ...cell.border };
                        if (r === rowStart) border.top = style;
                        if (r === rowEnd) border.bottom = style;
                        if (c === colStart) border.left = style;
                        if (c === colEnd) border.right = style;
                        cell.border = border;
                    }
                }
            };

            boxes.forEach(box => {
                const { node } = box;
                const baseColor = node.isDeptNode ? DEPT_FILL : getBaseColor(node.origNode);
                const borderColor = node.isDeptNode ? DEPT_BORDER : shadeColor(baseColor, -0.35);
                // Person boxes are now the same light/pastel palette as
                // department boxes (see STATIC_ROLE_COLORS), so both use
                // dark text — a fixed white no longer has enough contrast.
                const textColor = "#0f172a";

                sheet.mergeCells(box.rowStart + ROW_OFFSET + 1, box.colStart + COL_OFFSET + 1, box.rowEnd + ROW_OFFSET + 1, box.colEnd + COL_OFFSET + 1);
                const cell = sheet.getCell(box.rowStart + ROW_OFFSET + 1, box.colStart + COL_OFFSET + 1);
                cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: toArgb(baseColor) } };

                const subText = node.isDeptNode ? "Department" : [node.role, node.dept].filter(Boolean).join(" • ");
                cell.value = {
                    richText: [
                        { font: { bold: true, size: 11, color: { argb: toArgb(textColor) } }, text: `${node.name || ""}\n` },
                        { font: { size: 9, color: { argb: toArgb(textColor) } }, text: subText },
                    ],
                };

                applyBoxBorder(box.rowStart, box.rowEnd, box.colStart, box.colEnd, toArgb(borderColor));
            });

            const lineStyle = thinLine(toArgb(LINE_COLOR));
            lines.forEach(line => {
                if (line.type === "v") {
                    for (let r = line.rowStart; r <= line.rowEnd; r++) {
                        const cell = sheet.getCell(r + ROW_OFFSET + 1, line.col + COL_OFFSET + 1);
                        cell.border = { ...cell.border, left: lineStyle };
                    }
                } else {
                    for (let c = line.colStart; c <= line.colEnd; c++) {
                        const cell = sheet.getCell(line.row + ROW_OFFSET + 1, c + COL_OFFSET + 1);
                        cell.border = { ...cell.border, top: lineStyle };
                    }
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `OrganizationChart_Visual_${new Date().toISOString().slice(0, 10)}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting organization chart to Excel (chart):", error);
        } finally {
            setExporting(false);
        }
    };

    const exportMenuItems = [
        { key: "pdf", label: "Download as PDF", icon: <i className="fa-solid fa-file-pdf"></i> },
        { key: "excel", label: "Download as Excel", icon: <i className="fa-solid fa-file-excel"></i> },
        { key: "excel-chart", label: "Download as Excel (Chart)", icon: <i className="fa-solid fa-sitemap"></i> },
    ];

    const handleExportMenuClick = ({ key }) => {
        if (key === "pdf") handleDownloadPdf();
        if (key === "excel") handleDownloadExcel();
        if (key === "excel-chart") handleDownloadExcelChart();
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

    const showManageUsers = sessionActionIds?.includes(36);

    return (
        <div style={styles.wrapper} >
            <div className="d-flex justify-content-between align-items-center gap-2 my-3 mx-5">
                <div className="org-search">
                    <i className="fa-solid fa-magnifying-glass org-search-icon"></i>
                    <input
                        type="text"
                        className="org-search-input"
                        placeholder="Search name or email..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setSearchNotFound(false);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                        }}
                    />
                    {searchNotFound && <span className="org-search-hint">No match found</span>}
                </div>
                <div className="d-flex align-items-center gap-2">
                {showManageUsers && (
                    <Link
                        className="btn btn-outline-secondary btn-sm rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-2 premium-btn"
                        to="/users"
                    >
                        <i className="bi bi-people"></i> Manage Employees
                    </Link>
                )}
                <Dropdown
                    menu={{ items: exportMenuItems, onClick: handleExportMenuClick }}
                    trigger={["click"]}
                    disabled={exporting}
                >
                    <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-2 premium-btn"
                    >
                        <i className="bi bi-download"></i> {exporting ? "Exporting..." : "Export"}
                    </button>
                </Dropdown>
                <button
                    type="button"
                    className="btn btn-dark btn-sm rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-2 premium-btn"
                    onClick={() => navigate(-1)}
                >
                    <i className="bi bi-arrow-left"></i> Back
                </button>
                </div>
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
                        <div className="org-root" ref={chartContentRef}>
                            {data.map((node) => (
                                <HierarchyNode key={node.id} node={node} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <DetailsModal />

            <style>
                {`
                    .org-search {
                        position: relative;
                        display: inline-flex;
                        align-items: center;
                    }

                    .org-search-icon {
                        position: absolute;
                        left: 16px;
                        color: #94a3b8;
                        font-size: 13px;
                        pointer-events: none;
                    }

                    .org-search-input {
                        width: 260px;
                        padding: 9px 14px 9px 38px;
                        border-radius: 999px;
                        border: 1px solid #cbd5e1;
                        background: #ffffff;
                        font-size: 13px;
                        color: #0f172a;
                        outline: none;
                        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.06);
                        transition: border-color 0.15s ease, box-shadow 0.15s ease;
                    }

                    .org-search-input:focus {
                        border-color: #0ea5e9;
                        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.15);
                    }

                    .org-search-hint {
                        position: absolute;
                        left: 16px;
                        top: 100%;
                        margin-top: 4px;
                        font-size: 11px;
                        color: #dc2626;
                        white-space: nowrap;
                    }

                    /* ── search result flash: a bright ring that pulses a
                       couple of times then fades, so the matched card is
                       unmistakable even in a large, already-colorful chart,
                       without permanently altering its normal styling. ── */
                    .search-highlight {
                        animation: searchHighlightPulse 1s ease-out 2;
                        z-index: 20;
                    }

                    @keyframes searchHighlightPulse {
                        0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.9); }
                        70% { box-shadow: 0 0 0 14px rgba(234, 179, 8, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); }
                    }

                    .premium-btn {
                        font-weight: 500;
                        letter-spacing: 0.01em;
                        transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
                    }
                    .premium-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12) !important;
                    }
                    .premium-btn:active {
                        transform: translateY(0);
                    }
                    .org-chart-scope {
                        position: relative;
                        /* flex:1 1 auto + min-height:0 (not height:100%) —
                           this only claims the space left over in
                           styles.wrapper after the header row above it, and
                           min-height:0 overrides a flex item's default
                           min-height:auto so it's actually allowed to shrink
                           to that space instead of growing to fit its
                           content. "height: 100%" here used to resolve
                           against the wrapper's full 100vh regardless of the
                           header's own height, which made the wrapper's real
                           content taller than 100vh and pushed the page
                           itself into scrolling — see the long comment on
                           styles.wrapper for how that surfaced as "the
                           header disables itself after searching". */
                        flex: 1 1 auto;
                        min-height: 0;
                        overflow: hidden;
                        background: linear-gradient(
                            135deg,
                            #f8fafc 0%,
                            #e0e7ff 50%,
                            #f0f4f8 100%
                        );
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
                        background-position: center;
                        filter: blur(3px);
                    }

                    .org-tree-wrapper {
                        position: relative;
                        z-index: 1;
                        flex: 1;
                        min-height: 0;
                        width: 100%;
                        overflow: auto;
                        padding: 40px;
                        cursor: grab;
                        user-select: none;
                    }

                    .org-tree-wrapper.dragging {
                        cursor: grabbing;
                    }

                    .org-root {
                        display: inline-flex;
                        gap: 60px;
                        align-items: flex-start;
                    }

                    .hierarchy-node {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }

                    /* ── shared branch anchor: the single stem dropping from
                       a parent card down to the row of columns below it ── */
                    .branch {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }

                    .branch-stem {
                        width: 2px;
                        height: 36px;
                        background: #94a3b8;
                        flex-shrink: 0;
                    }

                    /* ── department box: a plain, name-only tier inserted
                       between a manager and their people when the team
                       spans more than one department (see buildDeptNodes)
                       — deliberately simple, matching how a department is
                       just a labeled rectangle on a hand-drawn org chart,
                       not a full person card. ── */
                    .dept-node-card {
                        position: relative;
                        box-sizing: border-box;

                        min-width: 150px;
                        padding: 16px 20px;

                        display: flex;
                        align-items: center;
                        justify-content: center;

                        background: #ffffff;
                        border: 2px solid #334155;
                        border-radius: 12px;

                        cursor: pointer;
                        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);

                        transition: transform 0.25s ease, box-shadow 0.25s ease;
                    }

                    .dept-node-card:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.16);
                    }

                    .dept-node-name {
                        font-size: 14px;
                        font-weight: 700;
                        color: #1e293b;
                        text-align: center;
                        letter-spacing: 0.2px;
                        white-space: nowrap;
                    }

                    /* ── dept-group frame: one bordered outline enclosing an
                       entire top-level department's family — its own dept
                       box, its manager (if any), and everything under that
                       manager, however many further tiers deep — colored by
                       department (see FanRow/getDeptBorderColor). This is
                       the group identifier the user asked for; individual
                       cards keep their normal role-colored border, they
                       don't each carry their own department color. ── */
                    .dept-group-frame {
                        display: inline-flex;
                        border: 2px solid #94a3b8;
                        border-radius: 22px;
                        padding: 14px 14px 18px;
                        background: rgba(255, 255, 255, 0.35);
                    }

                    /* ── fan-out mode: <= ${MAX_HORIZONTAL_CHILDREN} children
                       side by side under a shared bus line ── */
                    .fan-row {
                        position: relative;
                        display: flex;
                        justify-content: center;
                    }

                    .fan-col {
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        padding: 24px 20px 0;
                    }

                    .fan-col.multi::before,
                    .fan-col.multi::after {
                        content: "";
                        position: absolute;
                        top: 0;
                        height: 2px;
                        width: 50%;
                        background: #94a3b8;
                    }

                    .fan-col.multi::before {
                        left: 0;
                    }

                    .fan-col.multi::after {
                        right: 0;
                    }

                    .fan-col.multi:first-child::before {
                        background: transparent;
                    }

                    .fan-col.multi:last-child::after {
                        background: transparent;
                    }

                    .fan-drop {
                        position: absolute;
                        top: 0;
                        left: 50%;
                        width: 2px;
                        height: 24px;
                        background: #94a3b8;
                        transform: translateX(-50%);
                    }

                    /* ── vertical-list branch columns (the 2-column comb
                       split — see HierarchyBranch): a plain VerticalList
                       sits flush against its column's left side rather
                       than centered, so the drop from the bus line above
                       has to land at V_LIST_DROP_OFFSET px in from the
                       left — exactly where the comb's own trunk begins —
                       instead of at the column's horizontal center like
                       the generic .fan-col.multi case above. Each column
                       draws its own half of the bus line reaching from
                       that same offset to the shared boundary with the
                       other column, so the two halves plus both drops
                       read as one continuous line into each comb. ── */
                    .fan-col.vlist-col {
                        padding-top: 24px;
                    }

                    .fan-col.vlist-col::before {
                        content: "";
                        position: absolute;
                        top: 0;
                        height: 2px;
                        background: #94a3b8;
                    }

                    .fan-col.vlist-col:first-child::before {
                        left: ${V_LIST_DROP_OFFSET}px;
                        right: 0;
                    }

                    .fan-col.vlist-col:last-child::before {
                        left: 0;
                        right: calc(100% - ${V_LIST_DROP_OFFSET}px);
                    }

                    .fan-col.vlist-col .fan-drop {
                        left: ${V_LIST_DROP_OFFSET}px;
                        transform: none;
                    }

                    /* ── vertical-list mode: > ${MAX_HORIZONTAL_CHILDREN}
                       children stacked in a comb layout off one trunk line ── */
                    .v-list {
                        display: flex;
                        flex-direction: column;
                    }

                    .v-item {
                        position: relative;
                        padding-left: 40px;
                    }

                    .v-item:not(:first-child) {
                        margin-top: ${V_ITEM_GAP}px;
                    }

                    .v-item::before {
                        content: "";
                        position: absolute;
                        top: 0;
                        left: 20px;
                        bottom: 0;
                        width: 2px;
                        background: #94a3b8;
                    }

                    /* Every row but the first sits ${V_ITEM_GAP}px below the
                       previous one (margin-top above), but ::before only
                       covers its own row's box by default — pulling its top
                       up by that same gap extends the line through it, so
                       one row's trunk segment meets the next with no break. */
                    .v-item:not(:first-child)::before {
                        top: -${V_ITEM_GAP}px;
                    }

                    .v-item:last-child::before {
                        bottom: auto;
                        height: ${ROW_CENTER}px;
                    }

                    /* When the last row isn't also the first, its trunk
                       needs both adjustments at once: start ${V_ITEM_GAP}px
                       higher (to bridge the gap, like every other non-first
                       row) AND stop at this row's own center rather than
                       its bottom — so the combined height covers both. */
                    .v-item:not(:first-child):last-child::before {
                        top: -${V_ITEM_GAP}px;
                        height: ${V_ITEM_GAP + ROW_CENTER}px;
                    }

                    .v-item::after {
                        content: "";
                        position: absolute;
                        top: ${ROW_CENTER}px;
                        left: 20px;
                        width: 20px;
                        height: 2px;
                        background: #94a3b8;
                    }

                    .v-item-row {
                        display: inline-flex;
                    }

                    .children-count {
                        position: absolute;

                        right: -8px;
                        bottom: -10px;

                        min-width: 25px;
                        height: 25px;

                        padding: 0 7px;

                        display: flex;
                        align-items: center;
                        justify-content: center;

                        border-radius: 50px;

                        background: #0ea5e9;
                        color: #fff;

                        border: 2px solid #fff;

                        font-size: 11px;
                        font-weight: 700;

                        z-index: 10;

                        box-shadow: 0 4px 10px rgba(14, 165, 233, 0.25);
                    }

                    .children-count.collapsed {
                        background: #0b1f3a;
                    }

                    .children-count.expanded {
                        background: #0ea5e9;
                    }

                    .org-card {
                        box-sizing: border-box;
                        position: relative;
                        display: inline-block;

                        cursor: pointer;

                        transition:
                            transform 0.25s ease,
                            box-shadow 0.25s ease;
                    }

                    .org-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
                    }

                    .avatar-wrapper {
                        position: absolute;

                        left: 50%;
                        top: -2px;

                        transform: translateX(-50%);

                        transition: transform 0.25s ease;
                    }

                    .org-card:hover .avatar-wrapper {
                        transform: translateX(-50%) scale(1.08);
                    }

                    .role-dot {
                        position: absolute;
                        top: 10px;
                        left: 10px;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        border: 2px solid rgba(255, 255, 255, 0.9);
                        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
                        z-index: 5;
                    }

                    .controls {
                        position: fixed;

                        bottom: 30px;
                        left: 30px;

                        display: flex;
                        flex-direction: column;
                        gap: 12px;

                        z-index: 1000;
                    }

                    .zoom-btn {
                        width: 52px;
                        height: 52px;

                        border: none;
                        border-radius: 14px;

                        background: #0b1f3a;
                        color: #fff;

                        font-size: 20px;
                        font-weight: 600;

                        cursor: pointer;

                        display: flex;
                        align-items: center;
                        justify-content: center;

                        box-shadow: 0 12px 28px rgba(11, 31, 58, 0.3);

                        transition: all 0.25s ease;
                    }

                    .zoom-btn:hover {
                        transform: translateY(-3px);
                        background: #12305a;
                    }

                    /* ── premium details modal: styled like a physical ID
                       badge — dark header/photo-backdrop/name band derived
                       from the card's own accent color, light accent for
                       the photo panel and footer strip, no barcode. ── */
                    .org-detail-modal .ant-modal-content {
                        padding: 0;
                        border-radius: 26px;
                        overflow: hidden;
                        box-shadow: 0 30px 70px rgba(15, 23, 42, 0.3);
                    }

                    .org-detail-modal .ant-modal-close {
                        top: 14px;
                        right: 14px;
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        background: rgba(255, 255, 255, 0.85);
                    }

                    .org-detail-close {
                        font-size: 12px;
                        color: #1e293b;
                    }

                    .idcard {
                        display: flex;
                        flex-direction: column;
                    }

                    .idcard-dark {
                        display: flex;
                        flex-direction: column;
                    }

                    .idcard-header {
                        padding: 24px 20px 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }

                    .idcard-logo-icon {
                        width: 22px;
                        height: 22px;
                        border-radius: 6px;
                        background: rgba(255, 255, 255, 0.18);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #fff;
                        font-size: 11px;
                    }

                    .idcard-logo-img {
                        width: 22px;
                        height: 22px;
                        object-fit: contain;
                        border-radius: 6px;
                    }

                    .idcard-company {
                        color: #fff;
                        font-size: 13px;
                        font-weight: 700;
                        letter-spacing: 0.6px;
                        text-transform: uppercase;
                    }

                    /* Stage tall enough for the photo panel plus the extra
                       headroom a cutout image (head/shoulders) needs to
                       rise above the panel into the dark background. */
                    .idcard-photo-stage {
                        position: relative;
                        margin: 4px 24px 0;
                        height: 250px;
                    }

                    .idcard-photo-panel {
                        position: absolute;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        height: 185px;
                        border-radius: 24px;
                        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
                    }

                    .idcard-photo-img-wrap {
                        position: absolute;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        height: 100%;
                        display: flex;
                        align-items: flex-end;
                        justify-content: center;
                        pointer-events: none;
                    }

                    .idcard-photo-img-wrap img {
                        height: 100%;
                        width: auto;
                        max-width: none;
                        object-fit: contain;
                        object-position: bottom center;
                    }

                    .idcard-photo-fallback {
                        position: absolute;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        height: 185px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .idcard-name-wrap {
                        padding: 14px 24px 24px;
                        text-align: center;
                    }

                    .idcard-name {
                        color: #fff;
                        font-size: 22px;
                        font-weight: 800;
                        letter-spacing: 0.4px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .idcard-underline {
                        width: 46px;
                        height: 3px;
                        border-radius: 2px;
                        margin: 10px auto;
                    }

                    .idcard-role {
                        color: rgba(255, 255, 255, 0.85);
                        font-size: 13px;
                        font-weight: 600;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                    }

                    .idcard-footer {
                        padding: 16px 24px 20px;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        text-align: center;
                    }

                    .idcard-footer-row {
                        font-size: 13px;
                        font-weight: 700;
                        letter-spacing: 0.3px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .idcard-footer-label {
                        font-weight: 600;
                        opacity: 0.7;
                        text-transform: uppercase;
                        font-size: 11px;
                        letter-spacing: 0.5px;
                    }

                    .children-count {
                        cursor: pointer;
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
        // display:flex + flexDirection:column is what actually makes the
        // header row's height "count" against the 100vh budget below. Without
        // this, .org-chart-scope's own `height: 100%` resolves against this
        // wrapper's full 100vh (its containing block), on top of the header
        // row that already takes up space above it — so total content here
        // is (header height + 100vh), 40-70px taller than the wrapper itself.
        // This div's own `overflow: hidden` does NOT contain that overflow,
        // because the excess isn't clipped, it leaks into the actual page:
        // with no explicit height on <html>/<body>, the document itself
        // becomes taller than the viewport and starts scrolling. Nothing
        // normally triggers that page scroll — until the search feature's
        // scrollIntoView on a deep match does, at which point the browser
        // scrolls the *whole page* to satisfy it, carrying this header up
        // and off the top of the screen (reported as "the header gets
        // disabled after searching" — it isn't disabled, it's just been
        // scrolled out of view). Making this a column flex container lets
        // .org-chart-scope's `flex: 1 1 auto; min-height: 0` (see its CSS)
        // claim only the space actually left after the header, so the page
        // itself never needs to scroll and everything stays reachable.
        display: "flex",
        flexDirection: "column",
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

    // Dark slate text: the card face is a flat, light/pastel color (see
    // NodeCard's cardStyle and STATIC_ROLE_COLORS) so white text no longer
    // has enough contrast — these read against any of the STATIC_ROLE_COLORS
    // (or a similarly light service-provided BgColor).
    name: { fontWeight: "700", fontSize: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#0f172a", letterSpacing: "0.3px" },
    role: { fontSize: "12px", color: "rgba(15, 23, 42, 0.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "3px", fontWeight: "500", lineHeight: "1.2" },
    dept: { fontSize: "11px", color: "rgba(15, 23, 42, 0.85)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px", fontWeight: "700", lineHeight: "1.2" },
};

export default OrganizationChart;