import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { createRoot } from "react-dom/client";
import { Dropdown, Menu } from 'antd';
import { fetchWithAuth } from "../../../utils/api";
import ReviewInwardModel from "../components/ReviewInwardModel";
import { generateBarcodes } from "../components/ApproveInwardModel";
import {
    ArrowLeftOutlined,
    FilePdfOutlined,
    CheckOutlined,
    UnorderedListOutlined
} from "@ant-design/icons";

import { getInwardRecordDetails, getInventoryUnits, approveInward } from "../services/services";
import { printBarcodeLabels } from "../components/barcodeLabels";
import ImagePreviewModal from "../components/ImagePreviewModal";
import NotifyUserSelect from "../components/NotifyUserSelect";
import Base1 from "../../Config/Base1";
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import "./InwardRecordsPremium.css";
import "./InwardView.css";

// Documents (invoice / DC) are served from here – container photos still use BASE_IMAGE_API_GET
const BASE_DOCS_API_GET = "https://services.cooperwind.online/uploads/QACWIDocs/";

const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

const InwardView = () => {

    const location = useLocation();
    const navigate = useNavigate();
    const { id } = useParams();

    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [modules, setModules] = useState([]);

    const [loading, setLoading] = useState(true);
    const [record, setRecord] = useState(null);
    const [items, setItems] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [updatingInventory, setUpdatingInventory] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);

    // Items table paging (inwards can have 100+ items)
    const ITEMS_PER_PAGE = 8;
    const [itemPage, setItemPage] = useState(1);
    const [itemSearch, setItemSearch] = useState("");
    const closePhotoPreview = useCallback(() => setPhotoPreview(null), []);

    // Barcode units of this inward (after Update Inventory)
    const [units, setUnits] = useState([]);
    const [unitsLoading, setUnitsLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printItemIds, setPrintItemIds] = useState(new Set());
    const sessionUserData = JSON.parse(
        sessionStorage.getItem("userData") || "{}"
    );
    const userId = sessionUserData?.Id;
    const orgId = sessionUserData?.OrgId;

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
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            setMenuData(parsedMenu)

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Inwards"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    // =====================================
    // FETCH INWARD DETAILS
    // =====================================

    const fetchInwardDetails = async () => {

        if (!orgId || !id) {
            setLoading(false);
            return;
        }

        setLoading(true);

        try {

            const response = await getInwardRecordDetails(orgId, id);

            if (
                response?.status === 200 &&
                response?.result === "success"
            ) {

                setRecord(response?.data?.InwardRecord || null);

                setItems(
                    response?.data?.InwardRecordItems || []
                );

            } else {

                setRecord(null);
                setItems([]);

                Swal.fire(
                    "Error",
                    response?.response || "Unable to fetch inward details",
                    "error"
                );
            }

        } catch (error) {

            console.error("Get Inward Details Error:", error);

            Swal.fire(
                "Error",
                "Failed to load inward record details",
                "error"
            );

        } finally {

            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInwardDetails();
    }, [orgId, id]);

    // back to page 1 when the items or the search change
    useEffect(() => { setItemPage(1); }, [id, itemSearch, items.length]);

    // =====================================
    // BARCODE UNITS (generate + print)
    // =====================================

    const recordStatus = (record?.Status || "").toUpperCase();
    const inventoryUpdated = recordStatus === "INVENTORY_UPDATED" || recordStatus === "APPROVED";

    // GetInventoryUnits now needs ItemId -> call once per item of this inward and merge
    const itemsKey = items.map(i => `${i.RecordItemId}:${i.ItemId}`).join(",");

    const fetchUnits = useCallback(async () => {
        const inwardRecordId = record?.Id ?? id;
        if (!inwardRecordId || !items.length) return;

        setUnitsLoading(true);
        try {
            const results = await Promise.all(
                items.map(it =>
                    getInventoryUnits({
                        unitStatus: "ALL",
                        inwardRecordId: Number(inwardRecordId),
                        generationFilter: "ALL",
                        itemId: it.ItemId
                    })
                        .then(res =>
                            res?.status === 200 && String(res?.result).toLowerCase() === "success" && Array.isArray(res?.data)
                                ? res.data.map(u => ({
                                    ...u,
                                    RecordItemId: u.RecordItemId ?? it.RecordItemId,
                                    ItemName: u.ItemName || it.ItemName
                                }))
                                : []
                        )
                        .catch(err => {
                            console.error("GetInventoryUnits Error:", it.ItemId, err);
                            return [];
                        })
                )
            );

            // Merge, drop duplicates (same UnitId)
            const seen = new Set();
            setUnits(results.flat().filter(u => {
                const key = String(u.UnitId);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            }));
        } finally {
            setUnitsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record?.Id, id, itemsKey]);

    useEffect(() => {
        if (inventoryUpdated) fetchUnits();
        else setUnits([]);
    }, [inventoryUpdated, fetchUnits]);

    // Item name per RecordItemId (units only carry RecordItemId)
    const itemById = useMemo(() => {
        const map = {};
        items.forEach(i => { map[String(i.RecordItemId ?? i.Id)] = i; });
        return map;
    }, [items]);

    // IsGenerated may come as true/false, 1/0 or "true"/"false"
    const isGen = (u) => u.IsGenerated === true || u.IsGenerated === 1 ||
        String(u.IsGenerated).toLowerCase() === "true" || String(u.IsGenerated) === "1";

    const pendingUnits = units.filter(u => !isGen(u));
    const generatedUnits = units.filter(u => isGen(u) && u.Barcode);

    // Group generated barcodes by item (for the print modal)
    const printGroups = useMemo(() => {
        const groups = {};
        generatedUnits.forEach(u => {
            const key = String(u.RecordItemId);
            if (!groups[key]) {
                const it = itemById[key];
                groups[key] = { key, name: it?.ItemName || u.ItemName || "Item", code: it?.ItemCode || "", units: [] };
            }
            groups[key].units.push(u);
        });
        return Object.values(groups);
    }, [generatedUnits, itemById]);

    const openPrintModal = () => {
        setPrintItemIds(new Set(printGroups.map(g => g.key)));
        setShowPrintModal(true);
    };

    const togglePrintItem = (key) => {
        setPrintItemIds(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const printSelected = () => {
        const labels = printGroups
            .filter(g => printItemIds.has(g.key))
            .flatMap(g => g.units.map(u => ({ Barcode: u.Barcode, ItemName: g.name })));

        printBarcodeLabels(labels, `Labels ${record?.InwardRecordNo || ""}`);
        setShowPrintModal(false);
    };

    // Step 3: generate barcodes for all units that don't have one yet
    const handleGenerateBarcodes = async () => {
        if (!pendingUnits.length || generating) return;

        const perItem = {};
        pendingUnits.forEach(u => {
            const name = itemById[String(u.RecordItemId)]?.ItemName || u.ItemName || "Item";
            perItem[name] = (perItem[name] || 0) + 1;
        });

        const listHtml = Object.entries(perItem)
            .map(([name, count]) =>
                `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f2f4f7">
                    <span>${String(name).replace(/</g, "&lt;")}</span><b>${count}</b>
                </div>`)
            .join("");

        const confirm = await Swal.fire({
            icon: "question",
            title: `Generate ${pendingUnits.length} barcode${pendingUnits.length === 1 ? "" : "s"}?`,
            html: `<div style="text-align:left;font-size:14px;max-height:220px;overflow:auto">${listHtml}</div>`,
            showCancelButton: true,
            confirmButtonText: "Yes, generate",
            confirmButtonColor: "#2f5bea"
        });

        if (!confirm.isConfirmed) return;

        setGenerating(true);

        try {
            const response = await approveInward({
                OrgId: Number(orgId),
                InwardRecordId: Number(record?.Id ?? id),
                Action: "GENERATE_BARCODES",
                UserId: Number(userId),
                UnitsJson: pendingUnits.map(u => ({ UnitId: Number(u.UnitId) }))
            });

            const success =
                (response?.status === 200 && response?.result === "success") ||
                response?.success === true;

            if (!success) {
                Swal.fire("Error", response?.message || response?.response || "Unable to generate barcodes.", "error");
                return;
            }

            await fetchUnits();

            const next = await Swal.fire({
                icon: "success",
                title: "Barcodes generated",
                text: "Do you want to print the labels now?",
                showCancelButton: true,
                confirmButtonText: "Print labels",
                cancelButtonText: "Later",
                confirmButtonColor: "#2f5bea"
            });

            if (next.isConfirmed) setShowPrintModal("auto");
        } catch (error) {
            console.error("Generate Barcodes Error:", error);
            Swal.fire("Error", error?.message || "Failed to generate barcodes.", "error");
        } finally {
            setGenerating(false);
        }
    };

    // After "Print labels" from the success popup, open the print modal with fresh data
    useEffect(() => {
        if (showPrintModal === "auto" && !unitsLoading) {
            setPrintItemIds(new Set(printGroups.map(g => g.key)));
            setShowPrintModal(true);
        }
    }, [showPrintModal, unitsLoading, printGroups]);

    // =====================================
    // UPDATE INVENTORY (REVIEWED -> INVENTORY_UPDATED)
    // Yes / No confirm, then POST IIM/ApproveToInventory
    // =====================================

    const handleUpdateInventory = async () => {
        if (!orgId || !record?.Id || updatingInventory) return;

        const allUnits = generateBarcodes(record, items).flatMap(g => g.units);
        const verifiedTotal = allUnits.length;
        const declaredTotal = items.reduce((t, i) => t + (Number(i.DeclaredQuantity) || 0), 0);
        const variance = verifiedTotal - declaredTotal;

        if (verifiedTotal === 0) {
            Swal.fire({
                icon: "warning",
                title: "Nothing to update",
                text: "No verified quantity found for this inward.",
                confirmButtonColor: "#2f5bea"
            });
            return;
        }

        const esc = (v) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
        // 0 when nothing is short / excess, otherwise the difference (e.g. -1, +2)
        const varianceHtml = variance === 0
            ? `<span class="iv-swal-pill ok">0</span>`
            : `<span class="iv-swal-pill ${variance < 0 ? "bad" : "warn"}">${variance > 0 ? "+" : ""}${variance}</span>`;

        // Notify user dropdown (React) rendered inside the SweetAlert
        let notifyId = 0;
        let notifyRoot = null;
        const renderNotify = (busy = false) => notifyRoot?.render(
            <NotifyUserSelect
                orgId={orgId}
                value={notifyId}
                excludeId={userId}
                disabled={busy}
                placeholder="Choose a user to notify"
                onChange={(id) => { notifyId = Number(id) || 0; renderNotify(); }}
            />
        );

        const confirm = await Swal.fire({
            title: "Update inventory?",
            didOpen: () => {
                const el = document.getElementById("ivNotifyRoot");
                if (el) { notifyRoot = createRoot(el); renderNotify(); }
            },
            willClose: () => { const r = notifyRoot; notifyRoot = null; setTimeout(() => r?.unmount(), 0); },
            html: `
                <div class="iv-swal">
                    <div class="iv-swal-sub">Verified quantities of <b>${esc(record.InwardRecordNo)}</b> will be added to stock.</div>
                    <div class="iv-swal-grid">
                        <div><small>Items</small><b>${items.length}</b></div>
                        <div><small>Declared</small><b>${declaredTotal}</b></div>
                        <div><small>Verified</small><b>${verifiedTotal}</b></div>
                        <div><small>Variance</small><b>${varianceHtml}</b></div>
                    </div>
                    <div class="iv-swal-notify">
                        <label><i class="fa-regular fa-bell"></i> Notify user <span>optional</span></label>
                        <div id="ivNotifyRoot"></div>
                    </div>
                    <div class="iv-swal-note"><i class="fa-solid fa-circle-info"></i> This can't be undone.</div>
                </div>`,
            iconHtml: `<i class="fa-solid fa-boxes-stacked"></i>`,
            icon: "question",
            width: 680,                               // bigger: room for the Notify user list
            customClass: {
                popup: "iv-swal-popup iv-swal-lg",
                htmlContainer: "iv-swal-html",
                icon: "iv-swal-icon",
                title: "iv-swal-title",
                confirmButton: "iv-swal-confirm",
                cancelButton: "iv-swal-cancel",
                actions: "iv-swal-actions"
            },
            buttonsStyling: false,
            showCancelButton: true,
            reverseButtons: true,
            focusCancel: true,
            confirmButtonText: `<i class="fa-solid fa-check"></i> Yes, update`,
            cancelButtonText: "No, cancel",
            showLoaderOnConfirm: true,
            allowOutsideClick: () => !Swal.isLoading(),
            preConfirm: async () => {
                try {
                    const lastUnit = allUnits[allUnits.length - 1];
                    const response = await approveInward({
                        OrgId: Number(orgId),
                        InwardRecordId: Number(record.Id),
                        Action: "UPDATE_INVENTORY",
                        UserId: Number(userId),
                        NotifyId: notifyId,                       // user chosen in the confirm (0 = nobody)
                        InwardRecordJson: { Id: Number(record.Id), UserId: Number(userId), NotifyId: notifyId },
                        LastSequenceNo: lastUnit?.SerialNo ?? 0,
                        // SequenceNo = last 3 digits of the barcode; restarts at 1 for every item
                        // (INW1038GATE001..045, then INW1038SWIN001..)
                        UnitsJson: allUnits.map(u => ({
                            RecordItemId: Number(u.RecordItemId),
                            ItemId: Number(u.ItemId),
                            Barcode: u.Barcode,
                            SequenceNo: Number(u.SerialNo) || Number(String(u.Barcode || "").slice(-3)) || 0
                        }))
                    });

                    const ok =
                        (response?.status === 200 && response?.result === "success") ||
                        response?.success === true;

                    if (!ok) {
                        Swal.showValidationMessage(response?.message || response?.response || "Unable to update inventory.");
                        return false;
                    }
                    return response;
                } catch (error) {
                    console.error("Update Inventory Error:", error);
                    Swal.showValidationMessage(error?.message || "Failed to update inventory.");
                    return false;
                }
            }
        });

        if (!confirm.isConfirmed) return;

        setUpdatingInventory(true);
        try {
            await fetchInwardDetails();
        } finally {
            setUpdatingInventory(false);
        }

        Swal.fire({
            icon: "success",
            title: "Inventory updated",
            text: `${verifiedTotal} unit(s) added to stock for ${record.InwardRecordNo}.`,
            timer: 2200,
            showConfirmButton: false,
            customClass: { popup: "iv-swal-popup", title: "iv-swal-title" }
        });
    };

    // Load Portal modules for the toolbar dropdown
    useEffect(() => {
        if (orgId) fetchMenuData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    // =====================================
    // HELPERS
    // =====================================

    const formatDate = (date) => {
        if (!date) return "-";
        const d = new Date(date);
        if (isNaN(d)) return date;
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const status = (record?.Status || "").toUpperCase();
    const isPending = status === "PENDING_REVIEW";
    const isReviewed = status === "REVIEWED";
    // After ApproveToInventory the backend sets Status = "INVENTORY_UPDATED"
    const isApproved = status === "INVENTORY_UPDATED" || status === "APPROVED";

    const STATUS_META = {
        PENDING_REVIEW: { label: "Pending Review", cls: "ir-pill-blue" },
        REVIEWED: { label: "Reviewed", cls: "ir-pill-violet" },
        INVENTORY_UPDATED: { label: "Inventory Updated", cls: "ir-pill-green" },
        APPROVED: { label: "Inventory Updated", cls: "ir-pill-green" }
    };

    const statusMeta = STATUS_META[status] || {
        label: status ? status.replaceAll("_", " ") : "-",
        cls: "ir-pill-amber"
    };

    const hasVerified = (item) =>
        item.VerifiedQuantity !== null && item.VerifiedQuantity !== undefined && item.VerifiedQuantity !== "";

    const getDifference = (item) =>
        hasVerified(item)
            ? Number(item.VerifiedQuantity) - (Number(item.DeclaredQuantity) || 0)
            : null;

    const totalDeclared = items.reduce(
        (total, item) => total + (Number(item.DeclaredQuantity) || 0),
        0
    );

    const totalVerified = items.reduce(
        (total, item) => total + (Number(item.VerifiedQuantity) || 0),
        0
    );

    const anyVerified = items.some(hasVerified);

    const totalDifference = items.reduce(
        (sum, item) => sum + (getDifference(item) ?? 0),
        0
    );

    // Shortages and excesses are shown separately (not netted)
    const totalShort = items.reduce((t, it) => { const d = getDifference(it); return d !== null && d < 0 ? t + Math.abs(d) : t; }, 0);
    const totalExcess = items.reduce((t, it) => { const d = getDifference(it); return d !== null && d > 0 ? t + d : t; }, 0);

    const shortItems = items.filter(it => (getDifference(it) ?? 0) < 0).length;
    const excessItems = items.filter(it => (getDifference(it) ?? 0) > 0).length;
    const hasMismatch = totalShort > 0 || totalExcess > 0;

    // signed variance number: -1 red, +1 amber, 0 green
    // net = total row: a 0 that hides short + excess is shown grey, not green
    const renderVariance = (diff, strong = false, net = false) => {
        if (diff === null || diff === undefined) return <span className="text-muted">—</span>;
        const cls = diff < 0 ? "iv-var neg" : diff > 0 ? "iv-var pos" : (net && hasMismatch ? "iv-var net" : "iv-var zero");
        return (
            <span className={`${cls} ${strong ? "strong" : ""}`} title={net && hasMismatch ? "Net variance (shortage and excess cancel out)" : undefined}>
                {diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : 0}
            </span>
        );
    };

    // Total row result: shortage and excess shown separately + net, so "Short 1 / Excess 1" is not read as "all fine"
    const renderTotalPills = () => {
        if (!hasMismatch) return renderDiffPill(0);
        return (
            <div className="iv-var-total">
                <div className="iv-var-chips">
                    {totalShort > 0 && (
                        <span className="iv-var-chip neg">
                            <b>−{totalShort}</b> short <small>({shortItems} item{shortItems === 1 ? "" : "s"})</small>
                        </span>
                    )}
                    {totalExcess > 0 && (
                        <span className="iv-var-chip pos">
                            <b>+{totalExcess}</b> excess <small>({excessItems} item{excessItems === 1 ? "" : "s"})</small>
                        </span>
                    )}
                </div>
                {totalShort > 0 && totalExcess > 0 && (
                    <small className="iv-var-note">
                        Net {totalDifference > 0 ? `+${totalDifference}` : totalDifference}
                        {totalDifference === 0 ? " – totals match, but items do not" : ""}
                    </small>
                )}
            </div>
        );
    };

    const renderDiffPill = (diff) => {
        if (diff === null) return <span className="ir-pill" style={{ background: "#f2f4f7", color: "#667085" }}>Not counted</span>;
        if (diff === 0) return <span className="ir-pill ir-pill-green"><span className="ir-dot" />Matched</span>;
        if (diff < 0) return <span className="ir-pill" style={{ background: "#fef3f2", color: "#c4320a" }}><span className="ir-dot" />Short {Math.abs(diff)}</span>;
        return <span className="ir-pill ir-pill-amber"><span className="ir-dot" />Excess {diff}</span>;
    };

    const docUrl = record?.DocFile
        ? (/^https?:\/\//i.test(record.DocFile) ? record.DocFile : `${BASE_DOCS_API_GET}${encodeURIComponent(record.DocFile)}`)
        : null;

    // Items paging (search + page)
    const itemTerm = itemSearch.trim().toLowerCase();
    const filteredItems = itemTerm
        ? items.filter(it => [it.ItemName, it.ItemCode, it.PartNo].some(v => String(v || "").toLowerCase().includes(itemTerm)))
        : items;
    const itemPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
    const safeItemPage = Math.min(itemPage, itemPages);
    const pagedItems = filteredItems.slice((safeItemPage - 1) * ITEMS_PER_PAGE, safeItemPage * ITEMS_PER_PAGE);

    // Barcodes done = approved, nothing pending and at least one generated
    const barcodesDone = isApproved && !unitsLoading && pendingUnits.length === 0 && generatedUnits.length > 0;

    // Workflow steps for the timeline
    const steps = [
        {
            key: "registered",
            title: "Inward registered",
            sub: formatDate(record?.ArrivalDate),
            note: `${items.length} items, ${totalDeclared} units declared`,
            state: "done",
            icon: "fa-solid fa-truck-ramp-box"
        },
        {
            key: "reviewed",
            title: isPending ? "Awaiting physical count" : "Inward reviewed",
            sub: isPending ? "Stores to count and verify quantities" : `${totalVerified} units verified`,
            note: !isPending && record?.Remarks ? record.Remarks : null,
            state: isPending ? "current" : "done",
            icon: "fa-solid fa-clipboard-check"
        },
        {
            key: "approved",
            title: isApproved ? "Inventory updated" : "Update inventory",
            sub: isApproved ? "Verified quantities added to stock" : "Pending inventory update",
            state: isApproved ? "done" : isReviewed ? "current" : "pending",
            icon: "fa-solid fa-circle-check"
        },
        {
            key: "generated",
            title: barcodesDone ? "Barcodes generated" : "Generate barcodes",
            sub: !isApproved
                ? "After inventory is updated"
                : unitsLoading
                    ? "Checking units…"
                    : pendingUnits.length
                        ? `${pendingUnits.length} unit(s) waiting for barcodes`
                        : generatedUnits.length
                            ? `${generatedUnits.length} barcode(s) generated`
                            : "No units found for this inward",
            state: !isApproved ? "pending" : barcodesDone ? "done" : "current",
            icon: "fa-solid fa-barcode"
        }
    ];

    // =====================================
    // PAGE SHELL (toolbar always visible)
    // =====================================

    const toolbar = (
                <div id="kt_app_toolbar" className="app-toolbar iim-nav py-3 py-lg-4">
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
                            </div>
                        </div>
                    </div>
                </div>
    );

    const renderShell = (content) => (
        <Base1>
            {toolbar}
            <div id="kt_app_content" className="app-content flex-column-fluid pt-0 mb-5">
                <div id="kt_app_content_container" className="app-container container-xxl ir-page">
                    {content}
                </div>
            </div>
        </Base1>
    );

    // =====================================
    // LOADING / NOT FOUND
    // =====================================

    if (loading) {
        return renderShell(
            <div className="iv-card">
                <div className="iv-card-body">
                    {[70, 45, 90, 60].map((w, i) => (
                        <div key={i} className="ir-skel mb-4" style={{ width: `${w}%`, height: 14 }} />
                    ))}
                </div>
            </div>
        );
    }

    if (!record) {
        return renderShell(
            <div className="iv-card">
                <div className="ir-empty">
                    <div className="ir-empty-icon"><i className="fa-regular fa-folder-open" /></div>
                    <div className="ir-empty-title">Inward record not found</div>
                    <div className="ir-sub mb-5">It may have been removed or you may not have access.</div>
                    <button type="button" className="ir-btn-ghost" onClick={() => navigate(-1)}>
                        <ArrowLeftOutlined /> Back
                    </button>
                </div>
            </div>
        );
    }

    // =====================================
    // MAIN UI
    // =====================================

    return (
        <>
            {renderShell(
                <>
                    {/* HEADER */}
                    <div className="iv-header">
                        <div className="iv-header-left">
                            <button type="button" className="iv-back" onClick={() => navigate(-1)} title="Back">
                                <ArrowLeftOutlined />
                            </button>
                            <div>
                                <div className="iv-eyebrow">Inward Record</div>
                                <div className="iv-title-row">
                                    <h2 className="ir-title">{record.InwardRecordNo}</h2>
                                    <span className={`ir-pill ${statusMeta.cls}`}>
                                        <span className="ir-dot" />{statusMeta.label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="iv-actions">
                            {/* Step 3: generate barcodes (approved + units without barcodes) */}
                            {isApproved && pendingUnits.length > 0 && (
                                <button
                                    type="button"
                                    className="ir-btn-primary"
                                    disabled={generating || unitsLoading}
                                    onClick={handleGenerateBarcodes}
                                >
                                    {generating
                                        ? <><span className="spinner-border spinner-border-sm" /> Generating...</>
                                        : <><i className="fa-solid fa-barcode" /> Generate Barcodes ({pendingUnits.length})</>}
                                </button>
                            )}

                            {/* Step 4: print labels (generated barcodes exist) */}
                            {isApproved && generatedUnits.length > 0 && (
                                <button
                                    type="button"
                                    className={pendingUnits.length ? "ir-btn-ghost" : "ir-btn-primary"}
                                    disabled={generating || unitsLoading}
                                    onClick={openPrintModal}
                                >
                                    <i className="fa-solid fa-print" /> Print Labels ({generatedUnits.length})
                                </button>
                            )}

                            {isApproved && unitsLoading && !units.length && (
                                <span className="ir-sub"><span className="spinner-border spinner-border-sm me-2" />Checking barcodes…</span>
                            )}
                        </div>
                    </div>

                    {/* SUMMARY STRIP */}
                    <div className="iv-summary">
                        <div className="iv-stat">
                            <span className="iv-stat-icon ir-tone-blue"><i className="fa-regular fa-calendar" /></span>
                            <div>
                                <div className="iv-stat-label">Arrival</div>
                                <div className="iv-stat-value">{formatDate(record.ArrivalDate)}</div>
                            </div>
                        </div>

                        <div className="iv-stat">
                            <span className="iv-stat-icon ir-tone-violet"><i className="fa-solid fa-truck" /></span>
                            <div>
                                <div className="iv-stat-label">Vehicle</div>
                                <div className="iv-stat-value"><span className="ir-plate">{record.VehicleNumber || "-"}</span></div>
                            </div>
                        </div>

                        <div className="iv-stat">
                            <span className="iv-stat-icon ir-tone-amber"><i className="fa-solid fa-boxes-stacked" /></span>
                            <div>
                                <div className="iv-stat-label">Items / Declared</div>
                                <div className="iv-stat-value">{items.length} items · {totalDeclared} units</div>
                            </div>
                        </div>

                        <div className="iv-stat">
                            <span className={`iv-stat-icon ${!anyVerified ? "ir-tone-blue" : !hasMismatch ? "ir-tone-green" : "ir-tone-amber"}`}>
                                <i className="fa-solid fa-scale-balanced" />
                            </span>
                            <div>
                                <div className="iv-stat-label">Verified / Variance</div>
                                <div className="iv-stat-value">
                                    {anyVerified ? (
                                        <>
                                            {totalVerified} units
                                            <div className="iv-var-kpi">
                                                {!hasMismatch ? (
                                                    <span className="iv-var zero">All matched</span>
                                                ) : (
                                                    <>
                                                        {totalShort > 0 && <span className="iv-var neg">−{totalShort} short</span>}
                                                        {totalExcess > 0 && <span className="iv-var pos">+{totalExcess} excess</span>}
                                                        {totalShort > 0 && totalExcess > 0 && (
                                                            <span className="iv-var-net">net {totalDifference > 0 ? `+${totalDifference}` : totalDifference}</span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <span className="text-muted fw-semibold">Not counted yet</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row g-5">

                        {/* LEFT */}
                        <div className="col-lg-8">

                            {/* ITEMS */}
                            <div className="iv-card">
                                <div className="iv-card-head">
                                    <h3 className="iv-card-title"><i className="fa-solid fa-list-check" /> Items <span className="iv-count">{items.length}</span></h3>
                                    {items.length > ITEMS_PER_PAGE ? (
                                        <div className="iv-item-search">
                                            <i className="fa-solid fa-magnifying-glass" />
                                            <input
                                                type="text"
                                                placeholder="Search item, code or part no."
                                                value={itemSearch}
                                                onChange={(e) => setItemSearch(e.target.value)}
                                            />
                                            {itemSearch && (
                                                <button type="button" onClick={() => setItemSearch("")} title="Clear">
                                                    <i className="fa-solid fa-xmark" />
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="ir-sub">{items.length} line item(s)</span>
                                    )}
                                </div>

                                <div className="table-responsive">
                                    <table className="ir-table iv-table">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Declared</th>
                                                <th>Verified</th>
                                                <th>Variance</th>
                                                <th className="text-end">Result</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {pagedItems.length > 0 ? (
                                                pagedItems.map((item) => (
                                                    <tr key={item.RecordItemId}>
                                                        <td>
                                                            <div className="ir-record">
                                                                <span className="ir-record-icon"><i className="fa-solid fa-cube" /></span>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <div className="ir-record-no">{item.ItemName || "-"}</div>
                                                                    <div className="ir-sub">
                                                                        {item.ItemCode || "-"}
                                                                        {item.PartNo ? ` · Part No: ${item.PartNo}` : ""}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="ir-num">{item.DeclaredQuantity ?? "-"}</td>
                                                        <td className="ir-num">
                                                            {hasVerified(item) ? item.VerifiedQuantity : <span className="text-muted">—</span>}
                                                        </td>
                                                        <td className="ir-num">{renderVariance(getDifference(item))}</td>
                                                        <td className="text-end">{renderDiffPill(getDifference(item))}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5">
                                                        <div className="ir-empty">
                                                            <div className="ir-empty-title">{itemSearch ? `No items match "${itemSearch}"` : "No items found"}</div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>

                                        {items.length > 0 && (
                                            <tfoot>
                                                <tr>
                                                    <td>Total</td>
                                                    <td>{totalDeclared}</td>
                                                    <td>{anyVerified ? totalVerified : "—"}</td>
                                                    <td>{anyVerified ? renderVariance(totalDifference, true, true) : "—"}</td>
                                                    <td className="text-end">
                                                        {anyVerified ? renderTotalPills() : "—"}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {/* ITEMS PAGER */}
                                {itemPages > 1 && (
                                    <div className="iv-pager">
                                        <span className="ir-sub">
                                            {(safeItemPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeItemPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} items
                                        </span>
                                        <div className="iv-pager-ctrl">
                                            <button type="button" disabled={safeItemPage <= 1} onClick={() => setItemPage(p => Math.max(1, p - 1))} title="Previous">
                                                <i className="fa-solid fa-chevron-left" />
                                            </button>
                                            <div className="iv-pager-dots">
                                                {Array.from({ length: itemPages }).slice(
                                                    Math.max(0, Math.min(safeItemPage - 3, itemPages - 5)),
                                                    Math.max(0, Math.min(safeItemPage - 3, itemPages - 5)) + 5
                                                ).map((_, i) => {
                                                    const n = Math.max(0, Math.min(safeItemPage - 3, itemPages - 5)) + i + 1;
                                                    return (
                                                        <button
                                                            key={n}
                                                            type="button"
                                                            className={n === safeItemPage ? "active" : ""}
                                                            onClick={() => setItemPage(n)}
                                                        >
                                                            {n}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button type="button" disabled={safeItemPage >= itemPages} onClick={() => setItemPage(p => Math.min(itemPages, p + 1))} title="Next">
                                                <i className="fa-solid fa-chevron-right" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* NEXT STEP – Review Count / Update Inventory (below the items) */}
                                {(isPending || isReviewed) && (
                                    <div className="iv-items-action">
                                        <div className="iv-items-action-text">
                                            <i className={isPending ? "fa-solid fa-clipboard-list" : "fa-solid fa-boxes-stacked"} />
                                            <span>
                                                {isPending
                                                    ? "Count the items received and enter the verified quantities."
                                                    : "Quantities are verified. Add them to inventory."}
                                            </span>
                                        </div>

                                        {isPending && (
                                            <button type="button" className="ir-btn-primary" onClick={() => setShowReviewModal(true)}>
                                                <UnorderedListOutlined /> Review Count
                                            </button>
                                        )}

                                        {isReviewed && (
                                            <button
                                                type="button"
                                                className="iv-btn-approve"
                                                disabled={updatingInventory}
                                                onClick={handleUpdateInventory}
                                            >
                                                {updatingInventory
                                                    ? <><span className="spinner-border spinner-border-sm" /> Updating...</>
                                                    : <><CheckOutlined /> Update Inventory</>}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="row g-5" style={{ marginBottom: 20 }}>

                                {/* CONTAINER PHOTOS */}
                                <div className="col-md-6">
                                    <div className="iv-card h-100 mb-0">
                                        <div className="iv-card-head">
                                            <h3 className="iv-card-title"><i className="fa-solid fa-camera" /> Container photos</h3>
                                            <span className="ir-sub">By Security</span>
                                        </div>
                                        <div className="iv-card-body">
                                            {record.ImageUrl ? (
                                                <div className="iv-photos">
                                                    {String(record.ImageUrl).split(",").map(x => x.trim()).filter(Boolean).map((img, i, list) => {
                                                        const url = /^https?:\/\//i.test(img) ? img : `${BASE_IMAGE_API_GET}${img}`;
                                                        return (
                                                            <button
                                                                key={img + i}
                                                                type="button"
                                                                className="iv-photo"
                                                                title="Click to view full size"
                                                                onClick={(e) => !e.currentTarget.classList.contains("broken") && setPhotoPreview({
                                                                    url,
                                                                    title: record.InwardRecordNo,
                                                                    subtitle: `Container photo${list.length > 1 ? ` ${i + 1} of ${list.length}` : ""} · ${record.VehicleNumber || "-"}`
                                                                })}
                                                            >
                                                                <img
                                                                    src={url}
                                                                    alt={`Container photo ${i + 1}`}
                                                                    loading="lazy"
                                                                    onError={(e) => { e.currentTarget.parentElement.classList.add("broken"); }}
                                                                />
                                                                <span className="iv-photo-missing">
                                                                    <i className="fa-regular fa-image" />
                                                                    Image not available
                                                                </span>
                                                                <span className="iv-photo-zoom"><i className="fa-solid fa-magnifying-glass-plus" /></span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="iv-empty">
                                                    <i className="fa-regular fa-image" />
                                                    No photos uploaded yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* DOCUMENTS */}
                                <div className="col-md-6">
                                    <div className="iv-card h-100 mb-0">
                                        <div className="iv-card-head">
                                            <h3 className="iv-card-title"><i className="fa-regular fa-file-lines" /> Documents</h3>
                                        </div>
                                        <div className="iv-card-body">
                                            {record.DocFile ? (
                                                <a
                                                    className="iv-doc"
                                                    href={docUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    title={record.DocFile}
                                                    onClick={(e) => {
                                                        // images open in the in-page preview; PDFs etc. open normally
                                                        if (/\.(jpe?g|png|gif|webp|bmp)$/i.test(record.DocFile || "")) {
                                                            e.preventDefault();
                                                            setPhotoPreview({ url: docUrl, title: record.InwardRecordNo, subtitle: record.DocFile });
                                                        }
                                                    }}
                                                >
                                                    <span className="iv-doc-icon">{/\.(jpe?g|png|gif|webp|bmp)$/i.test(record.DocFile || "") ? <i className="fa-regular fa-file-image" /> : <FilePdfOutlined />}</span>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div className="iv-doc-name">{record.DocFile}</div>
                                                        <div className="ir-sub">Click to open</div>
                                                    </div>
                                                </a>
                                            ) : (
                                                <div className="iv-empty">
                                                    <i className="fa-regular fa-file" />
                                                    No documents uploaded.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* REMARKS */}
                            {record.Remarks && (
                                <div className="iv-card">
                                    <div className="iv-card-head">
                                        <h3 className="iv-card-title"><i className="fa-regular fa-comment-dots" /> Remarks</h3>
                                    </div>
                                    <div className="iv-card-body">
                                        <div className="iv-remark">
                                            <i className="fa-solid fa-quote-left" />
                                            {record.Remarks}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT – TIMELINE */}
                        <div className="col-lg-4">
                            <div className="iv-card">
                                <div className="iv-card-head">
                                    <h3 className="iv-card-title"><i className="fa-solid fa-clock-rotate-left" /> History</h3>
                                </div>
                                <div className="iv-card-body">
                                    <div className="iv-timeline">
                                        {steps.map((step) => (
                                            <div key={step.key} className={`iv-step ${step.state}`}>
                                                <span className="iv-step-dot">
                                                    <i className={step.state === "done" ? "fa-solid fa-check" : step.icon} />
                                                </span>
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="iv-step-title">{step.title}</div>
                                                    <div className="ir-sub">{step.sub}</div>
                                                    {step.note && <div className="iv-step-note">{step.note}</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </>
            )}

            <ReviewInwardModel
                show={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onSuccess={async () => {
                    await fetchInwardDetails();
                }}
                record={record}
                items={items}
                orgId={orgId}
                userId={userId}
            />

            <ImagePreviewModal image={photoPreview} onClose={closePhotoPreview} />

            {/* PRINT LABELS MODAL */}
            {showPrintModal === true && (
                <div className="ir-page">
                    <div className="ir-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setShowPrintModal(false); }}>
                        <div className="ir-modal" role="dialog" aria-modal="true">
                            <div className="ir-modal-head">
                                <div>
                                    <div className="ir-modal-title">Print labels</div>
                                    <div className="ir-modal-sub">{record?.InwardRecordNo} · choose the items to print</div>
                                </div>
                                <button type="button" className="ir-modal-close" onClick={() => setShowPrintModal(false)} title="Close">
                                    <i className="fa-solid fa-xmark" />
                                </button>
                            </div>

                            <div className="ir-modal-body" style={{ maxHeight: 340, overflowY: "auto" }}>
                                {printGroups.map(g => (
                                    <label key={g.key} className="iv-print-row">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={printItemIds.has(g.key)}
                                            onChange={() => togglePrintItem(g.key)}
                                        />
                                        <span className="iv-print-name">
                                            <b>{g.name}</b>
                                            {g.code && <small>{g.code}</small>}
                                        </span>
                                        <span className="iv-print-count">{g.units.length}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="ir-modal-foot">
                                <button type="button" className="ir-btn-ghost" onClick={() => setShowPrintModal(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="ir-btn-soft"
                                    disabled={!printItemIds.size}
                                    onClick={printSelected}
                                >
                                    <i className="fa-solid fa-print" /> Print (
                                    {printGroups.filter(g => printItemIds.has(g.key)).reduce((n, g) => n + g.units.length, 0)}
                                    )
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
};

export default InwardView;