
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Select, Tooltip, Modal } from 'antd';
import Swal from 'sweetalert2';
import '../../Config/Pagination.css';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Pagination from "../../Pagination/Pagination";
import RegisterAsset from "./Add";
import MachinesBulkUplaodExcel from "./MachinesBulkUploadExcel";
import RegisterMasterTypes from "../../Config/MasterTypes";
import { MACHINE_INFO_HTML_API } from "../../Config/Config";
// import AddAlert from "../PMMS/Alerts/Add";
import QRCode from "qrcode";

export default function AssetsList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [machinesData, setMachinesData] = useState([]);
    const [machinesCache, setMachinesCache] = useState({}); // { 1: [...], 2: [...], ... }
    const [loading, setLoading] = useState(false);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [assetsData, setAssetsData] = useState([]);
    const [unitsData, setUnitsData] = useState([]);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [selectedAssetId, setSelectedAssetId] = useState(null);
    const [navigationPath, setNavigationPath] = useState("");
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [qrAssetsData, setQRAssetsData] = useState([]);
    const [selectedAssetIds, setSelectedAssetIds] = useState([]);
    const savedState = sessionStorage.getItem("assetListState");
    const [qrSizeSetting, setQrSizeSetting] = useState(5); // Default to 5x5 cm
    const [currentPage, setCurrentPage] = useState(
        savedState
            ? JSON.parse(savedState).currentPage
            : 1
    );
    const [pageSize, setPageSize] = useState(
        savedState?.pageSize || 10
    );

    // const recordsPerPage = 10;

    const { Option } = Select;

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

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Assets"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlAssetsListData");

            // 1️⃣ LOAD FROM SESSION
            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                const units = parsed.units || [];
                const depts = parsed.depts || [];
                // const users = parsed.users || [];

                setDepartmentsData(depts);
                setUnitsData(units);
                // setUsersList(users);

                // ✅ restore default unit
                if (units.length > 0) {
                    setSelectedUnitId(units[0].ItemId);
                }

                return;
            }

            // 2️⃣ FETCH FROM API
            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const departmentsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            // const usersFilteredData = data.ResultData.filter(
            //     (item) => item.DDLName === "Users"
            // );

            const unitsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "UnitLocations"
            );


            setDepartmentsData(departmentsFilteredData);
            setUnitsData(unitsFilteredData);
            // setUsersList(usersFilteredData);

            // ✅ set first unit as default
            // Inside fetchDDLData, after calculating the default values:
            const defaultUnitId = unitsFilteredData.length > 0 ? unitsFilteredData[0].ItemId : null;
            const defaultDeptId = sessionUserData?.DeptId;

            if (defaultUnitId && defaultDeptId) {
                setSelectedUnitId(defaultUnitId);
                setSelectedDeptId(defaultDeptId);
            }
            // 3️⃣ SAVE TO SESSION (INCLUDING DEFAULT UNIT)
            sessionStorage.setItem(
                "ddlAssetsListData",
                JSON.stringify({
                    depts: departmentsFilteredData,
                    units: unitsFilteredData,
                    defaultUnitId, // ⭐ saved
                    // users: usersFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDepartmentsData([]);
            setUnitsData([]);
            setSelectedUnitId(null);
            // setUsersList([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDDLData();
            setSelectedDeptId(sessionUserData?.DeptId);
        }
    }, [sessionUserData]);

    const fetchAssetTypes = async () => {
        try {
            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString();
            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=${selectedDeptId}&ModuleId=${moduleId}&TypeCategory=1`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setAssetTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setAssetTypesData([]);
        }
    };

    const fetchAssetByType = async () => {
        if (!selectedDeptId) return;
        try {
            const response = await fetchWithAuth(`PMMS/getAssetsByType?OrgId=${sessionUserData?.OrgId}&AssetTypeId=${selectedAssetTypeId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setAssetsData(data.ResultData || []);
            } else {
                console.error('Failed to fetch suppliers data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching suppliers data:', error.message);
        }
    };

    const fetchAssetsForQRCode = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/GetAssets_QR?OrgId=${sessionUserData?.OrgId}&UnitId=0&DeptId=0&TypeId=0`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setQRAssetsData(data.ResultData || []);
            } else {
                console.error('Failed to fetch suppliers data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching suppliers data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchAssetsForQRCode();
        }
    }, [sessionUserData?.OrgId]);

    useEffect(() => {
        if (sessionUserData.OrgId && selectedDeptId) {
            fetchAssetTypes();
        }
    }, [sessionUserData, selectedDeptId]);

    useEffect(() => {
        if (sessionUserData.OrgId && selectedAssetTypeId) {
            fetchAssetByType();
        }
    }, [sessionUserData, selectedAssetTypeId]);

    const fetchAssets = async (
        page = 1,
        force = false,
        overrideDeptId = null,
        overrideUnitId = null,
        overrideOrgId = null,
        overrideAssetTypeId = null,
        overrideAssetId = null,
        overridePageSize = null   // ⭐ add this
    ) => {
        const deptId = overrideDeptId ?? selectedDeptId;
        const unitId = overrideUnitId ?? selectedUnitId;
        const orgId = overrideOrgId ?? sessionUserData?.OrgId;
        const assetTypeId = overrideAssetTypeId ?? selectedAssetTypeId;
        const assetId = overrideAssetId ?? selectedAssetId;

        if (!orgId) {
            console.log("OrgId not ready yet");
            return;
        }

        if (!deptId || !unitId) {
            if (force) {
                Swal.fire({
                    title: "Missing Information",
                    text: "Please choose Department and Unit.",
                    icon: "warning"
                });
            }
            return;
        }

        const finalPageSize = overridePageSize ?? pageSize;

        const cacheKey = `${deptId}-${unitId}-${assetTypeId || 0}-${assetId || 0}-${page}-${finalPageSize}`;
        // const cacheKey = `${deptId}-${unitId}-${assetTypeId || 0}-${assetId || 0}-${page}`;

        if (!force && machinesCache[cacheKey]) {
            setMachinesData(machinesCache[cacheKey]);
            setCurrentPage(page);
            return;
        }

        setLoading(true);

        const payload = {
            ServiceName: "GetMachinesByOrgId",
            PageNumber: page,
            PageSize: finalPageSize,
            // PageSize: recordsPerPage,
            Params: {
                OrgId: orgId || sessionUserData?.OrgId,
                UnitId: unitId || 0,
                DeptId: deptId || 0,
                AssetTypeId: assetTypeId || 0,
                MachineId: assetId || 0,
            },
        };

        try {
            const response = await fetchWithAuth(`PMMS/GetMachinesByOrgId`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to fetch machines");

            const data = await response.json();
            const pageData = data.data.result || [];
            const total = data.data.output.TotalCount || 0;

            setMachinesCache(prev => ({
                ...prev,
                [cacheKey]: pageData
            }));


            setMachinesData(pageData);
            setTotalRecords(total);
            setCurrentPage(page);

            const saved = sessionStorage.getItem("assetListState");

            if (saved) {
                const parsed = JSON.parse(saved);

                sessionStorage.setItem(
                    "assetListState",
                    JSON.stringify({
                        ...parsed,
                        page: page,
                        pageSize: finalPageSize,
                    })
                );
            }


        } catch (error) {
            console.error("Error fetching machines:", error.message);
            setMachinesData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {

        if (!sessionUserData?.OrgId) return;

        const savedState = sessionStorage.getItem("assetListState");

        if (savedState) {
            const parsed = JSON.parse(savedState);
            setSelectedDeptId(parsed.deptId);
            setSelectedAssetTypeId(parsed.assetTypeId);
            setSelectedUnitId(parsed.unitId);
            setSelectedAssetId(parsed.assetId);

            setPageSize(parsed.pageSize || 10);
            const restoredPage = parsed.page || 1;

            fetchAssets(
                restoredPage,
                true,
                parsed.deptId,
                parsed.unitId,
                sessionUserData.OrgId,
                parsed.assetTypeId,
                parsed.assetId,
                parsed.pageSize
            );

            setCurrentPage(restoredPage);

        } else {
            console.log("No saved filters, waiting for submit...");
        }

    }, [sessionUserData?.OrgId]);

    const handleFilterSubmit = () => {
        const newFilters = {
            deptId: selectedDeptId,
            assetTypeId: selectedAssetTypeId,
            unitId: selectedUnitId,
            assetId: selectedAssetId,
            page: 1,
            pageSize: pageSize
        };

        sessionStorage.setItem("assetListState", JSON.stringify(newFilters));

        setMachinesCache({});
        fetchAssets(
            1,
            true,
            selectedDeptId,
            selectedUnitId,
            sessionUserData.OrgId,
            selectedAssetTypeId,
            selectedAssetId
        );
    };

    const totalPages = Math.ceil(totalRecords / pageSize);

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "draft":
                return "badge-light-warning";
            case "pending approval":
                return "badge-light-info";
            case "approved":
                return "badge-light-primary";
            case "rejected":
                return "badge-light-danger";
            case "outofservice":
                return "badge-light-danger";
            case "active":
                return "badge-light-success";
            default:
                return "badge-light";
        }
    };

    const [statusCounts, setStatusCounts] = useState({
        outofservice: 0,
        active: 0,
    });

    const fetchStatusCounts = async () => {
        if (!selectedDeptId || !selectedUnitId) return;

        try {
            const response = await fetchWithAuth(
                `PMMS/GetAssetsByStatusCount?OrgId=${sessionUserData?.OrgId}&DeptId=${selectedDeptId}&UnitId=${selectedUnitId}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (response.ok) {
                const data = await response.json();

                const counts = {};

                data.ResultData?.forEach(item => {
                    const key = item.Status?.toLowerCase();  // ACTIVE → active
                    counts[key] = item.TotalCount || 0;
                });

                setStatusCounts(counts);  // ✅ Assign here
            } else {
                console.error("Failed to fetch status counts:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching status counts:", error.message);
        }
    };

    useEffect(() => {
        if (selectedDeptId && selectedUnitId) {
            fetchStatusCounts();
        }
    }, [selectedDeptId, selectedUnitId]);

    const renderStatusCounts = () => {
        const totalAssets = Object.values(statusCounts)
            .reduce((a, b) => a + b, 0);
        const total = statusCounts.active + statusCounts.outofservice;
        const activePercent = total ? (statusCounts.active / total) * 100 : 0;


        return (
            <div className="d-flex align-items-center gap-3 flex-wrap mt-3 mt-md-0">
                {Object.entries(statusCounts).map(([status, count]) => (
                    <div
                        key={status}
                        className={`status-pill ${getStatusBadgeClass(status)}`}
                    >
                        <i
                            className={`bi ${status === "active"
                                ? "bi-check-circle text-success"
                                : "bi-x-circle text-danger"
                                }`}
                        ></i>

                        <span>
                            {status === "active"
                                ? "Active"
                                : "Out Of Service"}
                        </span>

                        <span className="status-count shadow-sm">
                            {count}
                        </span>
                    </div>
                ))}
                <div className="status-pill badge-light-primary">
                    <i className="bi bi-box-seam text-primary"></i>

                    <span>Total Assets</span>

                    <span className="status-count shadow-sm">
                        {totalAssets}
                    </span>
                </div>

            </div>
        );
    };

    const generateA4QRSheet = async (assets, sizeCm) => {
        const canvas = document.createElement("canvas");

        // Using 300 DPI for high-quality printing
        // A4 at 300 DPI = 2480 x 3508 pixels
        canvas.width = 2480;
        canvas.height = 3508;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 1 cm at 300 DPI is ~118.1 pixels
        const pxPerCm = 118.1;
        const itemSize = sizeCm * pxPerCm;

        // Page margins (approx 1.5cm)
        const marginLeft = 1.5 * pxPerCm;
        const marginTop = 1.5 * pxPerCm;
        const gap = 0.5 * pxPerCm; // 0.5cm gap between stickers

        let cursorX = marginLeft;
        let cursorY = marginTop;

        for (const asset of assets) {
            const qrCanvas = await generateQRImageForAsset(asset, sizeCm);

            // Draw the sticker
            ctx.drawImage(qrCanvas, cursorX, cursorY, itemSize, itemSize);

            // Move to the next column
            cursorX += itemSize + gap;

            // If the next sticker won't fit in the current row, move to the next row
            if (cursorX + itemSize > canvas.width - marginLeft) {
                cursorX = marginLeft;
                cursorY += itemSize + gap;
            }

            // Stop if we run out of vertical space on one page
            if (cursorY + itemSize > canvas.height - marginTop) break;
        }

        return canvas.toDataURL("image/png", 1.0);
    };

    const handleGenerateSheet = async () => {

        const selectedAssets = qrAssetsData.filter(a =>
            selectedAssetIds.includes(a.MachineId)
        );

        const sheetImage = await generateA4QRSheet(selectedAssets, qrSizeSetting);

        const link = document.createElement("a");
        link.download = "qr-sheet.png";
        link.href = sheetImage;
        link.click();
    };

    const generateQRImageForAsset = async (asset, sizeCm, theme = "green") => {
        const url = `${MACHINE_INFO_HTML_API}${sessionUserData?.OrgId}/${asset.MachineId}`;
        const isGreen = theme === "green";

        // 3cm and 5cm should only show codes, not full details
        const isMinimal = sizeCm <= 5;

        // 1. Generate QR Data URL
        const qrDataUrl = await QRCode.toDataURL(url, {
            width: 600,
            margin: 1,
            color: {
                dark: isGreen ? "#ffffff" : "#000000",
                light: isGreen ? "#00a651" : "#ffffff",
            }
        });

        const qrImage = new Image();
        qrImage.src = qrDataUrl;
        await new Promise((resolve) => (qrImage.onload = resolve));

        // 2. Setup Dimensions (1cm ≈ 37.8 pixels for high-quality print)
        const pxPerCm = 37.8;
        const canvasSize = sizeCm * pxPerCm;

        const canvas = document.createElement("canvas");
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext("2d");

        // 3. Draw Background (Rounded)
        const radius = isMinimal ? 8 : 15;
        ctx.fillStyle = isGreen ? "#00a651" : "#ffffff";

        ctx.beginPath();
        ctx.roundRect(0, 0, canvasSize, canvasSize, radius);
        ctx.fill();

        ctx.textAlign = "center";
        ctx.fillStyle = isGreen ? "#ffffff" : "#000000";

        if (isMinimal) {
            // --- MINIMAL LAYOUT (3x3, 5x5) ---
            const qrDrawSize = canvasSize * 0.65;
            const qrX = (canvasSize - qrDrawSize) / 2;
            const qrY = (canvasSize - qrDrawSize) / 2;

            // Draw QR Background
            ctx.fillStyle = isGreen ? "#ffffff" : "#f3f3f3";
            ctx.fillRect(qrX - 2, qrY - 2, qrDrawSize + 4, qrDrawSize + 4);
            ctx.drawImage(qrImage, qrX, qrY, qrDrawSize, qrDrawSize);

            // Codes only
            // --- INSIDE generateQRImageForAsset (Minimal Layout 3x3) ---

            // 1. Get the shortened code (e.g., "2021/0016" or just "0016")
            const fullAssetCode = asset.AssetCode || "";
            const shortCode = fullAssetCode.includes('/')
                ? fullAssetCode.split('/').slice(-3).join('/')
                : fullAssetCode;

            // 2. Increase font size because the text is now much shorter
            const fontSize = sizeCm === 3 ? 12 : 16; // Bumped up from 7/10
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = isGreen ? "#ffffff" : "#000000";

            // 3. Draw the Machine Code (Top)
            ctx.fillText(asset.Code || "CODE", canvasSize / 2, qrY - 8);

            // 4. Draw the Shortened Asset Code (Bottom)
            ctx.fillText(shortCode, canvasSize / 2, qrY + qrDrawSize + (fontSize + 4));

        } else {
            // --- FULL LAYOUT (8x8) ---
            const padding = 15;
            const topMargin = 30;

            // Asset Name (Wrapped)
            ctx.font = "bold 14px Arial";
            const wrapText = (text, maxWidth) => {
                const words = (text || "").split(" ");
                const lines = []; let line = "";
                for (let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + " ";
                    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                        lines.push(line.trim()); line = words[n] + " ";
                    } else { line = testLine; }
                }
                lines.push(line.trim()); return lines;
            };

            const nameLines = wrapText(asset.AssetName, canvasSize - 30);
            nameLines.slice(0, 2).forEach((line, i) => {
                ctx.fillText(line, canvasSize / 2, topMargin + (i * 18));
            });

            // QR Code
            // const qrDrawSize = canvasSize * 0.5;
            // Inside generateQRImageForAsset for sizeCm === 8
            const qrDrawSize = canvasSize * 0.55; // Slightly larger QR
            const qrY = canvasSize * 0.25; // Move QR down to give name more room
            const nameFontSize = 32; // Scale up for 300 DPI
            ctx.font = `bold ${nameFontSize}px Arial`;
            const qrX = (canvasSize - qrDrawSize) / 2 + 10; // offset for vertical text
            // const qrY = 75;

            ctx.fillStyle = isGreen ? "#ffffff" : "#f3f3f3";
            ctx.fillRect(qrX - 5, qrY - 5, qrDrawSize + 10, qrDrawSize + 10);
            ctx.drawImage(qrImage, qrX, qrY, qrDrawSize, qrDrawSize);

            // Vertical Asset Code
            ctx.save();
            ctx.translate(20, qrY + (qrDrawSize / 2));
            ctx.rotate(-Math.PI / 2);
            ctx.font = "bold 12px Arial";
            ctx.fillText(asset.AssetCode || "", 0, 0);
            ctx.restore();

            // Bottom Details
            ctx.font = "bold 12px Arial";
            ctx.fillText(`Code: ${asset.Code}`, canvasSize / 2, qrY + qrDrawSize + 25);

            const date = asset.PurchaseDate ? new Date(asset.PurchaseDate).toLocaleDateString("en-GB") : "N/A";
            ctx.font = "10px Arial";
            ctx.fillText(`Purchase: ${date}`, canvasSize / 2, qrY + qrDrawSize + 42);
        }

        return canvas;
    };

    const selectedAssets = (qrAssetsData || []).filter(asset =>
        selectedAssetIds.includes(asset.MachineId)
    );

    const sizeConfig = {
        3: { max: 35, label: "3x3 cm (Sticker)" }, // ~6 cols x 9 rows
        5: { max: 12, label: "5x5 cm (Standard)" }, // ~4 cols x 5 rows
        8: { max: 6, label: "8x8 cm (Large Label)" } // ~2 cols x 3 rows
    };

    const showAddBtn = sessionActionIds?.includes(1);
    const showTypeBtn = sessionActionIds?.includes(18);
    const showDeptDwn = sessionActionIds?.includes(25);
    const showQRDwn = sessionActionIds?.includes(31);

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Assets List</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Assets</li>
                        </ul>
                    </div>
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        {showAddBtn && (
                           <Link
                                to="/eam/inactive-assets"
                                className="btn btn-sm btn-light-danger d-flex align-items-center gap-2 px-4 shadow-sm border border-danger border-opacity-25"
                                style={{ borderRadius: '8px', transition: 'all 0.3s' }}
                            >
                                <i className="fa-solid fa-box-archive fs-7"></i>
                                <span className="fw-bold d-none d-md-inline">Inactive Assets</span>
                            </Link>
                        )}
                        {showTypeBtn && (
                            <button
                                className="btn btn-info btn-sm d-flex align-items-center gap-2 px-3 shadow-sm custom-btn"
                                type="button"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAddMasterTypes"
                                aria-controls="offcanvasRightAddMasterTypes"
                            >
                                <i className="bi bi-building-add fs-5"></i>
                                <span className="d-none d-md-inline">Asset Types</span>
                            </button>
                        )}
                        {showAddBtn && (
                            <button
                                className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-3 shadow-sm custom-btn"
                                type="button"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAdd"
                                aria-controls="offcanvasRightAdd"
                            >
                                <i className="bi bi-plus-circle fs-5"></i>
                                <span className="d-none d-md-inline">Register Asset</span>
                            </button>
                        )}
                        
                        {/* <a
                                className={`btn btn-info btn-sm d-none d-md-block `}
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightMacBulkUploadExcel"
                                aria-controls="offcanvasRightMacBulkUploadExcel"><i class="fa-solid fa-cloud-arrow-up"></i> <span className="d-none d-md-inline">Bulk Upload</span>
                            </a>
                         */}
                        {showQRDwn && (
                            <button
                                type="button"
                                className="btn btn-warning btn-sm d-flex align-items-center gap-2 px-3 shadow-sm custom-btn"
                                onClick={() => setIsModalOpen(true)}
                            >
                                <i className="bi bi-qr-code-scan"></i> <span className="d-none d-md-inline">Generate QR Sheet</span>
                            </button>
                        )}

                    </div>
                </div>
            </div>

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card mb-3 shadow-sm">
                        <div className="p-2">
                            <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 border-bottom pb-3">
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-filter-right fs-2 text-primary me-2"></i>
                                    <h5 className="text-gray-800 fw-bolder mb-0">
                                        Filter Parameters
                                    </h5>
                                </div>

                                <div className="d-flex align-items-center gap-2 flex-wrap mt-3 mt-md-0 d-none d-md-block">
                                    {renderStatusCounts()}
                                </div>

                                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                                    <span className="text-muted fw-semibold">Show</span>
                                    <Select
                                        value={pageSize}
                                        style={{ width: 80 }}
                                        size="small"
                                        onChange={(value) => {
                                            setPageSize(value);
                                            setCurrentPage(1);

                                            const saved = JSON.parse(
                                                sessionStorage.getItem("assetListState") || "{}"
                                            );

                                            sessionStorage.setItem(
                                                "assetListState",
                                                JSON.stringify({
                                                    ...saved,
                                                    page: 1,
                                                    pageSize: value
                                                })
                                            );

                                            fetchAssets(
                                                1,
                                                true,
                                                selectedDeptId,
                                                selectedUnitId,
                                                sessionUserData?.OrgId,
                                                selectedAssetTypeId,
                                                selectedAssetId,
                                                value
                                            );
                                        }}
                                        options={[
                                            { value: 10, label: "10" },
                                            { value: 50, label: "50" },
                                            { value: 100, label: "100" }
                                        ]}
                                    />
                                    <span className="text-muted fw-semibold">
                                        entries
                                    </span>
                                </div>
                            </div>

                            <div className="row d-flex justify-content-start align-items-end">
                                <div className="col-6 col-md-2">
                                    <label className="form-label">
                                        Unit <span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        showSearch
                                        loading={unitsData.length === 0}
                                        placeholder={unitsData.length === 0 ? "Loading..." : "Select Unit"}
                                        className="w-100"
                                        value={selectedUnitId || undefined}
                                        style={{ height: '2.6rem' }}
                                        onChange={(value) => setSelectedUnitId(value)}
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                        disabled={!unitsData || !showDeptDwn}
                                    >
                                        <Option value="0">ALL</Option>
                                        {unitsData?.map((unt) => (
                                            <Option key={unt.ItemId} value={unt.ItemId}>
                                                {unt.DisplayValue}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-6 col-md-2">
                                    <label className="form-label">
                                        Department <span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        showSearch
                                        loading={!departmentsData}
                                        placeholder={!departmentsData ? "Loading..." : "Select Department"}
                                        className="w-100"
                                        value={selectedDeptId || undefined}
                                        style={{ height: "2.6rem" }}
                                        onChange={(value) => { setSelectedDeptId(value); setSelectedAssetTypeId(null); }}
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                        disabled={!departmentsData || !showDeptDwn}
                                    >
                                        <Option value="0">ALL</Option>
                                        {departmentsData?.map((dep) => (
                                            <Option key={dep.ItemId} value={dep.ItemId}>
                                                {dep.DisplayValue}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-3">
                                    <label className="form-label">
                                        Asset Type
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select Asset Type"
                                        className="w-100"
                                        value={selectedAssetTypeId || undefined}
                                        style={{ height: "2.6rem" }}
                                        onChange={(value) => { setSelectedAssetTypeId(value); setSelectedAssetId(null); }}
                                        filterOption={(input, option) => {
                                            const text = `${option?.children}`.toLowerCase();
                                            return text.includes(input.toLowerCase());
                                        }}
                                    >
                                        <Option value="0">ALL</Option>
                                        {Array.isArray(assetTypesData) &&
                                            assetTypesData?.map((assTyp) => (
                                                <Option key={assTyp.Id} value={assTyp.Id}>
                                                    {assTyp.TypeName}
                                                </Option>
                                            ))
                                        }
                                    </Select>
                                </div>
                                <div className="col-12 col-md-3 mb-md-0 mb-3">
                                    <label className="form-label">
                                        Asset
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select Asset"
                                        className="w-100"
                                        value={selectedAssetId || undefined}
                                        style={{ height: "2.6rem" }}
                                        onChange={(value) => setSelectedAssetId(value)}
                                        filterOption={(input, option) => {
                                            const text = `${option?.children}`.toLowerCase();
                                            return text.includes(input.toLowerCase());
                                        }}
                                    >
                                        {Array.isArray(assetsData) &&
                                            assetsData?.map((assTyp) => (
                                                <Option key={assTyp.AssetId} value={assTyp.AssetId}>
                                                    {assTyp.AssetName} {assTyp.Code}
                                                </Option>
                                            ))
                                        }
                                    </Select>
                                </div>
                                <div className="col-auto d-flex">
                                    <button
                                        className="btn btn-light-primary btn-sm border border-primary w-100 w-md-auto"
                                        type="button"
                                        style={{ height: "2.6rem", fontSize: "0.9rem" }}
                                        onClick={handleFilterSubmit}
                                        disabled={loading}
                                    >
                                        <i className="bi bi-filter-circle"></i>{loading ? 'Submitting...' : 'Submit'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card d-md-block d-none mt-1 mb-10 shadow-sm">
                        <div className="table-responsive " style={{ overflowX: "hidden" }}>
                            <table className="table align-middle table-hover gs-7 gy-4 mb-0 fs-6">
                                <thead className="bg-light-primary">
                                    <tr className="text-start text-muted fw-bold fs-7 text-uppercase border-bottom-2 border-primary">
                                        <th className="">S.No</th>
                                        <th className="min-w-125px">Name</th>
                                        <th className="min-w-125px">Code</th>
                                        <th className="min-w-125px">Department</th>
                                        <th className="min-w-125px">Asset Type</th>
                                        <th className="min-w-125px text-center">Purchased On</th>
                                        <th className="min-w-100px text-center">Next Maint.</th>
                                        <th className="min-w-100px">Status</th>
                                        <th className="">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="fw-semibold text-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="9" className="text-center py-10">
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Loading Assets...
                                            </td>
                                        </tr>
                                    ) : machinesData && machinesData.length > 0 ? (
                                        machinesData.map((item, index) => (
                                            <tr
                                                key={index}
                                                className="shadow-sm rounded-3"
                                                style={{
                                                    transition: "all 0.2s ease-in-out",
                                                }}
                                            >
                                                {/* S.No */}
                                                <td className="text-muted">
                                                    {(currentPage - 1) * pageSize + index + 1}
                                                </td>

                                                {/* ✅ Asset Name with Tooltip + Ellipsis */}
                                                <td>
                                                    {item.AssetName && item.AssetName.length > 10 ? (
                                                        <Tooltip
                                                            title={item.AssetName}
                                                            placement="topLeft"
                                                            color="blue"
                                                        >
                                                            <Link
                                                                to={`/eam/asset-view/${item.OrgId}/${item.MachineId}`}
                                                                className="fw-bold text-dark"
                                                                style={{
                                                                    display: "inline-block",
                                                                    maxWidth: "200px",
                                                                    whiteSpace: "nowrap",
                                                                    overflow: "hidden",
                                                                    textOverflow: "ellipsis",
                                                                    verticalAlign: "middle",
                                                                }}
                                                            >
                                                                {item.AssetName}
                                                            </Link>
                                                        </Tooltip>
                                                    ) : (
                                                        <Link
                                                            to={`/eam/asset-view/${item.OrgId}/${item.MachineId}`}
                                                            className="fw-bold text-dark"
                                                        >
                                                            {item.AssetName || "N/A"}
                                                        </Link>
                                                    )}
                                                </td>

                                                {/* Code */}
                                                <td><span className="badge badge-light-primary fs-6 rounded-pill">{item.Code || "-"}</span></td>

                                                {/* Department */}
                                                <td>
                                                    <span className="text-gray-800">
                                                        {item.DeptName || "N/A"}
                                                    </span>
                                                </td>

                                                {/* Asset Type */}
                                                <td >{item.TypeName && item.TypeName.length > 5 ? (
                                                    <Tooltip
                                                        title={item.TypeName}
                                                        placement="topLeft"
                                                        color="blue"
                                                    >

                                                        <span style={{
                                                            display: "inline-block",
                                                            maxWidth: "110px",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            verticalAlign: "middle",
                                                        }}>{item.TypeName}</span>
                                                    </Tooltip>
                                                ) : (
                                                    <span>{item.TypeName || "N/A"}</span>
                                                )}</td>

                                                {/* Installed Date */}
                                                <td className="text-center text-primary">
                                                    {item.PurchaseDate &&
                                                        !isNaN(new Date(item.PurchaseDate).getTime())
                                                        ? new Date(item.PurchaseDate).toLocaleDateString("en-GB")
                                                        : "-"}
                                                </td>

                                                {/* Upcoming Maintenance */}
                                                <td className="text-center text-danger">
                                                    {item.UpcomingMaintenanceDate &&
                                                        !isNaN(new Date(item.UpcomingMaintenanceDate).getTime())
                                                        ? new Date(item.UpcomingMaintenanceDate).toLocaleDateString(
                                                            "en-GB"
                                                        )
                                                        : "-"}
                                                </td>

                                                {/* Status Badge */}
                                                <td>
                                                    <span
                                                        className={`badge px-3 py-2 rounded-pill ${getStatusBadgeClass(
                                                            item.Status
                                                        )}`}
                                                    >
                                                        {item.Status}
                                                    </span>
                                                </td>

                                                {/* Action Button */}
                                                <td className="text-center">
                                                    <Link to={`/eam/asset-view/${item.OrgId}/${item.MachineId}`}>
                                                        <button className="btn btn-sm btn-light-primary fw-bold">
                                                            View <i className="fa-solid fa-arrow-right ms-1"></i>
                                                        </button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" className="text-center py-10 text-muted">
                                                No Assets Available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            <div className="mx-3">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                                    recordsPerPage={pageSize} // This MUST match the 'limit' you use in your API call
                                    onPageChange={(page) => fetchAssets(page)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="d-block d-md-none">
                        {machinesData && machinesData.length > 0 ? (
                            machinesData.map((item, index) => (
                                <div key={index} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className={`badge ${getStatusBadgeClass(item.Status)}`}>
                                                {item.Status || 'N/A'} {index}
                                            </div>

                                            <div className="d-flex align-items-center gap-2">
                                                <Link to={`/eam/asset-view/${item.OrgId}/${item.MachineId}`}>
                                                    <span
                                                        className="badge badge-light-info cursor-pointer"
                                                    >View more <i class="fa-solid fa-arrow-right-long mt-1 ms-1 pulse-arrow"></i></span>
                                                </Link>

                                                <span className="arrow-container text-muted" style={{ fontSize: '1.1rem' }}>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Name:</span>
                                                <span className="fw-semibold">{item?.AssetName?.length > 25 ? item?.AssetName.slice(0, 25) + '...' : item.AssetName}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Code:</span>
                                                <span className="fw-semibold">{item.Code || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Department:</span>
                                                <span className="fw-semibold">{item.DeptName || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Instalation:</span>
                                                <span className="fw-semibold text-success">
                                                    {item.PurchaseDate
                                                        ? new Date(item.PurchaseDate).toLocaleDateString("en-GB")
                                                        : "-"}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Next Maintenance:</span>
                                                <span className="fw-semibold text-info">
                                                    {item.UpcomingMaintenanceDate
                                                        ? new Date(item.UpcomingMaintenanceDate).toLocaleDateString("en-GB")
                                                        : "-"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))

                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                            recordsPerPage={pageSize} // This MUST match the 'limit' you use in your API call
                            onPageChange={(page) => fetchAssets(page)}
                        />
                    </div>
                </div>
            </div>


            {/* QR Sheet asset modal */}
            <Modal
                title="Select Assets for QR Sheet"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={860}
                centered
            >
                <div className="d-flex flex-column gap-3">
                    <div className="p-3 border rounded bg-light shadow-sm">
                        <label className="fw-bold mb-3 d-block text-primary">
                            <i className="bi bi-aspect-ratio me-2"></i>Step 1: Choose Sticker Size
                        </label>
                        <div className="d-flex gap-3">
                            {[3, 5, 8].map(size => (
                                <div key={size} className="form-check custom-option ms-4">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="qrSize"
                                        id={`size${size}`}
                                        checked={qrSizeSetting === size}
                                        onChange={() => {
                                            setQrSizeSetting(size);
                                            setSelectedAssetIds([]);
                                        }}
                                    />
                                    <label className="form-check-label cursor-pointer" htmlFor={`size${size}`}>
                                        <span className="fw-bold d-block">{size} × {size} cm</span>
                                        <small className="text-muted">Max {sizeConfig[size].max} per sheet</small>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {qrSizeSetting && (
                        <div className="animate__animated animate__fadeIn">
                            <label className="fw-bold mb-2 d-block">
                                <i className="bi bi-list-check me-2"></i>Step 2: Select Assets
                                <span className="text-muted ms-2 fw-normal">
                                    (Up to {sizeConfig[qrSizeSetting].max} assets for this size)
                                </span>
                            </label>

                            <Select
                                mode="multiple"
                                showSearch
                                placeholder={`Search and select up to ${sizeConfig[qrSizeSetting].max} assets`}
                                style={{
                                    width: "100%",
                                    maxHeight: "100px",
                                    overflowY: "auto"
                                }}
                                maxTagCount="responsive"
                                optionLabelProp="label"
                                value={selectedAssetIds}
                                onChange={(value) => setSelectedAssetIds(value)}
                                maxCount={sizeConfig[qrSizeSetting].max}
                                filterOption={(input, option) =>
                                    (option.searchValue ?? "").toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {qrAssetsData.map(asset => (
                                    <Option
                                        key={asset.MachineId}
                                        value={asset.MachineId}
                                        label={asset.AssetCode}
                                        searchValue={`${asset.Code} ${asset.AssetCode} ${asset.AssetName}`}
                                    >
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="fw-bold">{asset.Code} - {asset.AssetCode}</span>
                                            <small
                                                className="text-muted ms-3"
                                                style={{
                                                    maxWidth: "250px",
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis"
                                                }}
                                            >
                                                {asset.AssetName}
                                            </small>
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {selectedAssets.length > 0 && (
                        <div className="border rounded bg-light overflow-hidden shadow-sm">
                            <div className="fw-bold p-3 bg-white border-bottom d-flex justify-content-between align-items-center">
                                <span>
                                    <i className="bi bi-box-seam me-2 text-primary"></i>
                                    Selected Assets
                                </span>
                                <span className={`badge ${selectedAssets.length >= sizeConfig[qrSizeSetting].max ? 'bg-danger' : 'bg-primary'}`}>
                                    {selectedAssets.length} / {sizeConfig[qrSizeSetting].max}
                                </span>
                            </div>
                            <div
                                style={{
                                    maxHeight: "240px",
                                    overflowY: "auto",
                                    scrollbarWidth: "thin",
                                    overflowX: "hidden",
                                }}
                                className="custom-scrollbar"
                            >
                                <table className="table table-sm table-hover mb-0 bg-white">
                                    <thead className="table-light sticky-top" style={{ zIndex: 1 }}>
                                        <tr className="text-muted fw-bold fs-7 text-uppercase">
                                            <th className="ps-3" style={{ width: "50px" }}>#</th>
                                            <th>Asset Name</th>
                                            <th>Code</th>
                                            <th>Asset Code</th>
                                            <th className="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedAssets.map((asset, index) => (
                                            <tr key={asset.MachineId} className="align-middle">
                                                <td className="ps-3 text-muted">{index + 1}</td>
                                                <td>
                                                    <Tooltip title={asset.AssetName}>
                                                        <div style={{
                                                            maxWidth: "300px",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            cursor: "help"
                                                        }}>
                                                            {asset.AssetName}
                                                        </div>
                                                    </Tooltip>
                                                </td>
                                                <td className="fw-bold text-primary">{asset.Code}</td>
                                                <td><code>{asset.AssetCode}</code></td>
                                                <td className="text-center">
                                                    <button
                                                        className="btn btn-link btn-sm p-0"
                                                        onClick={() => setSelectedAssetIds(prev => prev.filter(id => id !== asset.MachineId))}
                                                    >
                                                        <i className="bi bi-x-circle text-danger"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selectedAssets.length > 5 && (
                                <div className="text-center py-1 bg-white border-top">
                                    <small className="text-muted">Scroll to see more</small>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="text-end sticky-bottom p-3 bg-white border-top">
                        <Tooltip
                            title={
                                selectedAssets.length === 0
                                    ? "Please select at least one asset to generate a sheet"
                                    : `Generate A4 sheet with ${selectedAssets.length} stickers (${qrSizeSetting}x${qrSizeSetting} cm)`
                            }
                            placement="topRight"
                        >
                            <span className="d-inline-block">
                                <button
                                    className="btn btn-success btn-sm shadow px-3"
                                    disabled={selectedAssets.length === 0}
                                    style={selectedAssets.length === 0 ? { pointerEvents: 'none' } : {}}
                                    onClick={() => {
                                        handleGenerateSheet();
                                        setIsModalOpen(false);
                                    }}
                                >
                                    <i className="bi bi-qr-code-scan me-2"></i>
                                    Generate QR Sheet
                                </button>
                            </span>
                        </Tooltip>
                    </div>
                </div>
            </Modal>

            <style>
                {`
                /* Hide scrollbar for the Select internal selection area */
                .ant-select-selector {
                    max-height: 100px !important;
                    overflow-y: auto !important;
                    scrollbar-width: none; /* Firefox */
                }

                .ant-select-selector::-webkit-scrollbar {
                    display: none; /* Chrome/Safari */
                }
                                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #999;
                }
                                .custom-option {
                    padding: 10px 15px;
                    border: 1px solid #dee2e6;
                    border-radius: 8px;
                    transition: all 0.2s;
                    background: white;
                }

                .custom-option:has(input:checked) {
                    border-color: #0d6efd;
                    background-color: #f0f7ff;
                    box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.1);
                }

                .cursor-pointer {
                    cursor: pointer;
                }
                .custom-btn {
                    transition: all 0.2s ease-in-out;
                    border-radius: 8px;
                }

                .custom-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
                }
                .status-pill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 14px;
                    border-radius: 30px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                }

                .status-pill:hover {
                    transform: translateY(-2px);
                    cursor: pointer;
                }

                .status-count {
                    background: rgba(255,255,255,0.5);
                    padding: 3px 8px;
                    border-radius: 20px;
                    font-weight: 700;
                }

                .table tbody tr:hover {
                    background-color: #f8faff !important;
                    transform: scale(1.01);
                    transition: 0.2s ease-in-out;
                }

                .pulse-arrow {
                        animation: pulseMove 1s infinite ease-in-out;
                    }

                    @keyframes pulseMove {
                        0%   { transform: translateX(0); opacity: 1; }
                        50%  { transform: translateX(5px); opacity: 0.7; }
                        100% { transform: translateX(0); opacity: 1; }
                    }


                                    customClass: {
                            popup: 'qr-popup-no-scroll'
                        },
                    .slide-panel {
                        opacity: 0;
                        transform: translateX(20px); /* Start slightly to the right */
                        animation: slideFadeIn 0.3s ease-out forwards;
                    }

                    @keyframes slideFadeIn {
                        from {
                            opacity: 0;
                            transform: translateX(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }

                    @keyframes bounceLeft {
                        0%, 100% {
                            transform: translateX(0);
                        }
                        50% {
                            transform: translateX(-5px);
                        }
                    }

                    .bounce-left {
                        animation: bounceLeft 1s infinite ease-in-out;
                    }
                `}
            </style>

            <RegisterAsset />
            <RegisterMasterTypes typeCategory={1} />
            <MachinesBulkUplaodExcel />

        </Base1>
    )
}