
import React, { useState, useEffect, useRef } from "react";
import Base1 from "../../Config/Base1";
import { Popover } from 'antd';
import { MACHINE_INFO_HTML_API } from "../../Config/Config";
import '../../Config/Pagination.css';
import Swal from 'sweetalert2';
import '../../Config/Loader.css';
import { useNavigate } from "react-router-dom";
import RegisterMachine from "./Add";
import QRCode from "qrcode";
import ViewMachine from "./View";
import MachineParts from "./Parts";
import EditMachine from "./Edit";
import AddAlerts from "./AddAlerts";
import { fetchWithAuth } from "../../../utils/api";
import MachinesBulkUplaodExcel from "./MachinesBulkUploadExcel";
import Pagination from "../../Pagination/Pagination";
import { Select } from "antd";
import AddAlert from './../Alerts/Add';

export default function MachinesList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [machinesData, setMachinesData] = useState([]);
    const [machinesCache, setMachinesCache] = useState({}); // { 1: [...], 2: [...], ... }
    const [loading, setLoading] = useState(false);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [machinessDDData, setMachinesDDData] = useState([]);
    const [editData, setEditData] = useState([]);
    const [alertData, setAlertData] = useState([]);
    const [viewData, setViewData] = useState([]);
    const [navigationPath, setNavigationPath] = useState("");
    const [partsData, setPartsData] = useState([]);
    const [openPanelId, setOpenPanelId] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [selectedMCNId, setSelectedMCNId] = useState(null);
    const [lastFilters, setLastFilters] = useState({
        deptId: null,
        machineId: null
    });
    
    const recordsPerPage = 10;

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
                (item) => item.MenuName === "Machines"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchDepartmentsData = async () => {
        if (sessionUserData.OrgId) {
            try {
                const response = await fetchWithAuth(`visitor/getDepts?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setDepartmentsData(data.ResultData || []);
                } else {
                    setDepartmentsData([]);
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                setDepartmentsData([]);
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

    const fetchMCNsDDData = async () => {
        if (sessionUserData.OrgId) {
            try {
                const response = await fetchWithAuth(`PMMS/MachinesByDeptId?DeptId=${selectedDeptId}&OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setMachinesDDData(data.ResultData || []);
                } else {
                    setMachinesDDData([]);
                    console.error('Failed to fetch machines data:', response.statusText);
                }
            } catch (error) {
                setMachinesDDData([]);
                console.error('Error fetching machines data:', error.message);
            }
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDepartmentsData();
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (sessionUserData.OrgId && selectedDeptId) {
            fetchMCNsDDData();
        }
    }, [sessionUserData, selectedDeptId]);

    const fetchMachines = async (page = 1, force = false) => {

        if (!force && machinesCache[page]) {
            setMachinesData(machinesCache[page]);
            setCurrentPage(page);
            return;
        }

        setLoading(true);

        const payload = {
            ServiceName: "GetMachinesByOrgId",
            PageNumber: page,
            PageSize: recordsPerPage,
            Params: {
                OrgId: sessionUserData.OrgId,
                MachineId: selectedMCNId || 0,
                DeptId: selectedDeptId || 0,
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
                [`${selectedDeptId || 0}-${page}`]: pageData,
            }));

            setMachinesData(pageData);
            setTotalRecords(total);
            setCurrentPage(page);

        } catch (error) {
            console.error("Error fetching machines:", error.message);
            setMachinesData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!sessionUserData.OrgId) return;

        setMachinesCache({});     // clear first
        fetchMachines(1, true);         // then fetch
    }, [sessionUserData]);

    // const handleFilterSubmit = () => {
    //     setMachinesCache({});
    //     fetchMachines(1, true); // force fresh fetch
    // };

    const handleFilterSubmit = () => {
        const newFilters = {
            deptId: selectedDeptId,
            machineId: selectedMCNId
        };
    
        // Prevent fetch if filters did NOT change
        if (
            newFilters.deptId === lastFilters.deptId &&
            newFilters.machineId === lastFilters.machineId
        ) {
            console.log("Filters unchanged → Skipping fetch");
            return;
        }
    
        // Filters changed → update & fetch
        setLastFilters(newFilters);
    
        setMachinesCache({});
        fetchMachines(1, true);
    };    

    const handleView = (item) => {
        setViewData(item);
    };

    const handleEdit = (item) => {
        setEditData(item);
    };

    const handleAlert = (item) => {
        setAlertData(item);
    };

    const handleParts = (item) => {
        setPartsData(item);
    };

    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    // Function to wrap text for canvas
    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let line = '';
        let lineCount = 0;

        for (let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, y + lineCount * lineHeight);
                line = words[n] + ' ';
                lineCount++;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, y + lineCount * lineHeight);
        return lineCount + 1; // returns number of lines drawn
    }

    // const handlegenerateQRCode = async (item) => {
    //     const url = `${MACHINE_INFO_HTML_API}${sessionUserData?.OrgId}/${item.MachineId}`;
      
    //     try {
    //       // Generate black QR on white background
    //       const qrDataUrl = await QRCode.toDataURL(url, {
    //         width: 250,
    //         color: {
    //           dark: "#000000", // black QR
    //           light: "#ffffff", // white background
    //         },
    //         margin: 1,
    //       });
      
    //       const qrImage = new Image();
    //       qrImage.src = qrDataUrl;
      
    //       qrImage.onload = () => {
    //         const qrSize = 250;
    //         const padding = 25;
    //         const borderRadius = 20;
    //         const topMargin = 30;
    //         const lineHeight = 26;
      
    //         // Text wrap helper
    //         function wrapText(ctx, text, maxWidth) {
    //           const words = (text || "").split(" ");
    //           const lines = [];
    //           let line = "";
    //           for (let n = 0; n < words.length; n++) {
    //             const testLine = line + words[n] + " ";
    //             const metrics = ctx.measureText(testLine);
    //             const testWidth = metrics.width;
    //             if (testWidth > maxWidth && n > 0) {
    //               lines.push(line.trim());
    //               line = words[n] + " ";
    //             } else {
    //               line = testLine;
    //             }
    //           }
    //           lines.push(line.trim());
    //           return lines;
    //         }
      
    //         // Create a temp context to measure text
    //         const tempCanvas = document.createElement("canvas");
    //         const tempCtx = tempCanvas.getContext("2d");
    //         tempCtx.font = "bold 22px Arial";
    //         const maxTextWidth = qrSize + padding * 2 - padding * 2;
      
    //         const nameLines = wrapText(tempCtx, item.MachineName || "Machine Name", maxTextWidth);
      
    //         const spacing = 20;
    //         const bottomTextLines = 3;
    //         const totalHeight =
    //           topMargin + nameLines.length * lineHeight + spacing + qrSize + bottomTextLines * 25 + 40;
      
    //         const canvas = document.createElement("canvas");
    //         canvas.width = qrSize + padding * 2;
    //         canvas.height = totalHeight;
    //         const ctx = canvas.getContext("2d");
      
    //         // Background (white)
    //         ctx.fillStyle = "#ffffff";
    //         ctx.fillRect(0, 0, canvas.width, canvas.height);
      
    //         // Machine Name (black)
    //         ctx.fillStyle = "#000000";
    //         ctx.font = "bold 22px Arial";
    //         ctx.textAlign = "center";
    //         nameLines.forEach((line, i) => {
    //           ctx.fillText(line, canvas.width / 2, topMargin + i * lineHeight);
    //         });
      
    //         // Draw QR
    //         const qrY = topMargin + nameLines.length * lineHeight + spacing;
    //         const qrX = padding;
    //         ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      
    //         // Black QR borders
    //         const lineLength = 25;
    //         const lineWidth = 3;
    //         ctx.strokeStyle = "#000000";
    //         ctx.lineWidth = lineWidth;
      
    //         const drawCorner = (x1, y1, x2, y2, x3, y3) => {
    //           ctx.beginPath();
    //           ctx.moveTo(x1, y1);
    //           ctx.lineTo(x2, y2);
    //           ctx.lineTo(x3, y3);
    //           ctx.stroke();
    //         };
    //         drawCorner(qrX, qrY + lineLength, qrX, qrY, qrX + lineLength, qrY); // TL
    //         drawCorner(qrX + qrSize - lineLength, qrY, qrX + qrSize, qrY, qrX + qrSize, qrY + lineLength); // TR
    //         drawCorner(qrX, qrY + qrSize - lineLength, qrX, qrY + qrSize, qrX + lineLength, qrY + qrSize); // BL
    //         drawCorner(qrX + qrSize - lineLength, qrY + qrSize, qrX + qrSize, qrY + qrSize, qrX + qrSize, qrY + qrSize - lineLength); // BR
      
    //         // Bottom text (black)
    //         let bottomY = qrY + qrSize + 30;
    //         ctx.font = "18px Arial";
    //         ctx.fillText(item.MachineCode || "Code", canvas.width / 2, bottomY);
      
    //         bottomY += 25;
    //         ctx.font = "16px Arial";
    //         ctx.fillText(`Supplier: ${item.SupplierName || "N/A"}`, canvas.width / 2, bottomY);
      
    //         bottomY += 22;
    //         // ✅ Correct date formatting (DD/MM/YYYY)
    //         const formattedDate = item.UpcomingMaintenanceDate
    //           ? new Date(item.UpcomingMaintenanceDate).toLocaleDateString("en-GB")
    //           : "N/A";
    //         ctx.fillText(`Purchase: ${formattedDate}`, canvas.width / 2, bottomY);
      
    //         // Export final image
    //         const finalQRWithText = canvas.toDataURL("image/png", 1.0);
      
    //         Swal.fire({
    //           title: `${item.MachineName || "Machine"} QR Code`,
    //           html: `<img src="${finalQRWithText}" alt="QR Code" style="max-width:100%; border-radius:8px; box-shadow:0 2px 5px rgba(0,0,0,0.1);" />`,
    //           showCancelButton: true,
    //           confirmButtonText: 'Download <i class="fa-regular fa-circle-down"></i>',
    //           cancelButtonText: "Cancel",
    //           customClass: {
    //             popup: "qr-popup-no-scroll",
    //           },
    //           preConfirm: () => {
    //             const link = document.createElement("a");
    //             link.href = finalQRWithText;
    //             link.download = `QR_${item.MachineCode || "Machine"}_${item.MachineId}.png`;
    //             document.body.appendChild(link);
    //             link.click();
    //             document.body.removeChild(link);
    //           },
    //         });
    //       };
    //     } catch (err) {
    //       console.error("QR Code generation failed:", err);
    //       Swal.fire("Error", "Failed to generate QR Code", "error");
    //     }
    //   };
      
    // const handlegenerateQRCode = async (item) => {
    //     const url = `${MACHINE_INFO_HTML_API}${sessionUserData?.OrgId}/${item.MachineId}`;
      
    //     try {
    //       // Generate white QR code on green background
    //       const qrDataUrl = await QRCode.toDataURL(url, {
    //         width: 250,
    //         color: {
    //           dark: "#ffffff", // white QR
    //           light: "#00a651", // green background
    //         },
    //         margin: 1,
    //       });
      
    //       const qrImage = new Image();
    //       qrImage.src = qrDataUrl;
      
    //       qrImage.onload = () => {
    //         const qrSize = 250;
    //         const padding = 25;
    //         const borderRadius = 20;
    //         const topMargin = 40;
    //         const lineHeight = 26;
      
    //         // Helper: wrap text into multiple lines
    //         function wrapText(ctx, text, maxWidth) {
    //           const words = (text || "").split(" ");
    //           const lines = [];
    //           let line = "";
    //           for (let n = 0; n < words.length; n++) {
    //             const testLine = line + words[n] + " ";
    //             const metrics = ctx.measureText(testLine);
    //             const testWidth = metrics.width;
    //             if (testWidth > maxWidth && n > 0) {
    //               lines.push(line.trim());
    //               line = words[n] + " ";
    //             } else {
    //               line = testLine;
    //             }
    //           }
    //           lines.push(line.trim());
    //           return lines;
    //         }
      
    //         // Temporary canvas for measuring text width
    //         const tempCanvas = document.createElement("canvas");
    //         const tempCtx = tempCanvas.getContext("2d");
    //         tempCtx.font = "bold 22px Arial";
    //         const maxTextWidth = qrSize + padding * 2 - padding * 2;
    //         const nameLines = wrapText(tempCtx, item.MachineName || "Machine Name", maxTextWidth);
      
    //         // Dynamic height calculation
    //         const spacing = 20; // between name & QR
    //         const bottomTextLines = 3;
    //         const totalHeight =
    //           topMargin + nameLines.length * lineHeight + spacing + qrSize + bottomTextLines * 25 + 40;
      
    //         // Create actual canvas
    //         const canvas = document.createElement("canvas");
    //         canvas.width = qrSize + padding * 2;
    //         canvas.height = totalHeight;
    //         const ctx = canvas.getContext("2d");
      
    //         // 🟩 Background with rounded corners (green)
    //         ctx.fillStyle = "#00a651";
    //         ctx.beginPath();
    //         ctx.moveTo(borderRadius, 0);
    //         ctx.lineTo(canvas.width - borderRadius, 0);
    //         ctx.quadraticCurveTo(canvas.width, 0, canvas.width, borderRadius);
    //         ctx.lineTo(canvas.width, canvas.height - borderRadius);
    //         ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - borderRadius, canvas.height);
    //         ctx.lineTo(borderRadius, canvas.height);
    //         ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - borderRadius);
    //         ctx.lineTo(0, borderRadius);
    //         ctx.quadraticCurveTo(0, 0, borderRadius, 0);
    //         ctx.closePath();
    //         ctx.fill();
      
    //         // 🏷️ Machine Name (white text)
    //         ctx.fillStyle = "#ffffff";
    //         ctx.font = "bold 22px Arial";
    //         ctx.textAlign = "center";
    //         nameLines.forEach((line, i) => {
    //           ctx.fillText(line, canvas.width / 2, topMargin + i * lineHeight);
    //         });
      
    //         // 🧾 Draw QR code
    //         const qrY = topMargin + nameLines.length * lineHeight + spacing;
    //         const qrX = padding;
    //         ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      
    //         // White corner borders
    //         const lineLength = 25;
    //         const lineWidth = 4;
    //         ctx.strokeStyle = "#ffffff";
    //         ctx.lineWidth = lineWidth;
      
    //         const drawCorner = (x1, y1, x2, y2, x3, y3) => {
    //           ctx.beginPath();
    //           ctx.moveTo(x1, y1);
    //           ctx.lineTo(x2, y2);
    //           ctx.lineTo(x3, y3);
    //           ctx.stroke();
    //         };
    //         drawCorner(qrX, qrY + lineLength, qrX, qrY, qrX + lineLength, qrY); // TL
    //         drawCorner(qrX + qrSize - lineLength, qrY, qrX + qrSize, qrY, qrX + qrSize, qrY + lineLength); // TR
    //         drawCorner(qrX, qrY + qrSize - lineLength, qrX, qrY + qrSize, qrX + lineLength, qrY + qrSize); // BL
    //         drawCorner(qrX + qrSize - lineLength, qrY + qrSize, qrX + qrSize, qrY + qrSize, qrX + qrSize, qrY + qrSize - lineLength); // BR
      
    //         // 🧍 Bottom details (white text)
    //         let bottomY = qrY + qrSize + 30;
    //         ctx.font = "18px Arial";
    //         ctx.fillText(item.MachineCode || "Code", canvas.width / 2, bottomY);
      
    //         bottomY += 25;
    //         ctx.font = "16px Arial";
    //         ctx.fillText(`Supplier: ${item.SupplierName || "P Chaitanya"}`, canvas.width / 2, bottomY);
        
    //         bottomY += 22;
    //         const formattedDate = item.PurchaseDate
    //           ? new Date(item.PurchaseDate).toLocaleDateString("en-GB")
    //           : "N/A";
    //         ctx.fillText(`Purchase: ${formattedDate}`, canvas.width / 2, bottomY);
      
    //         // Export to image
    //         const finalQRWithText = canvas.toDataURL("image/png", 1.0);
      
    //         Swal.fire({
    //           title: `${item.MachineName || "Machine"} QR Code`,
    //           html: `<img src="${finalQRWithText}" alt="QR Code" style="max-width:100%; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.3);" />`,
    //           showCancelButton: true,
    //           confirmButtonText: 'Download <i class="fa-regular fa-circle-down"></i>',
    //           cancelButtonText: "Cancel",
    //           customClass: {
    //             popup: "qr-popup-no-scroll",
    //           },
    //           preConfirm: () => {
    //             const link = document.createElement("a");
    //             link.href = finalQRWithText;
    //             link.download = `QR_${item.MachineCode || "Machine"}_${item.MachineId}.png`;
    //             document.body.appendChild(link);
    //             link.click();
    //             document.body.removeChild(link);
    //           },
    //         });
    //       };
    //     } catch (err) {
    //       console.error("QR Code generation failed:", err);
    //       Swal.fire("Error", "Failed to generate QR Code", "error");
    //     }
    //   };

    const handlegenerateQRCode = async (item) => {
        const url = `${MACHINE_INFO_HTML_API}${sessionUserData?.OrgId}/${item.MachineId}`;
      
        const generateQRImage = async (theme = "green") => {
          const isGreen = theme === "green";
      
          // Generate QR Data URL
          const qrDataUrl = await QRCode.toDataURL(url, {
            width: 250,
            color: {
              dark: isGreen ? "#ffffff" : "#000000", // text color
              light: isGreen ? "#00a651" : "#ffffff", // background color
            },
            margin: 1,
          });
      
          // Load QR image
          const qrImage = new Image();
          qrImage.src = qrDataUrl;
          await new Promise((resolve) => (qrImage.onload = resolve));
      
          // Canvas setup
          const qrSize = 250;
          const padding = 25;
          const borderRadius = 20;
          const topMargin = 40;
          const lineHeight = 26;
      
          // Helper to wrap text
          function wrapText(ctx, text, maxWidth) {
            const words = (text || "").split(" ");
            const lines = [];
            let line = "";
            for (let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + " ";
              const metrics = ctx.measureText(testLine);
              const testWidth = metrics.width;
              if (testWidth > maxWidth && n > 0) {
                lines.push(line.trim());
                line = words[n] + " ";
              } else {
                line = testLine;
              }
            }
            lines.push(line.trim());
            return lines;
          }
      
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d");
          tempCtx.font = "bold 22px Arial";
          const maxTextWidth = qrSize + padding * 2 - padding * 2;
          const nameLines = wrapText(tempCtx, item.MachineName || "Machine Name", maxTextWidth);
      
          const spacing = 20;
          const bottomTextLines = 3;
          const totalHeight =
            topMargin + nameLines.length * lineHeight + spacing + qrSize + bottomTextLines * 25 + 40;
      
          const canvas = document.createElement("canvas");
          canvas.width = qrSize + padding * 2;
          canvas.height = totalHeight;
          const ctx = canvas.getContext("2d");
      
          // Background
          ctx.fillStyle = isGreen ? "#00a651" : "#ffffff";
          ctx.beginPath();
          ctx.moveTo(borderRadius, 0);
          ctx.lineTo(canvas.width - borderRadius, 0);
          ctx.quadraticCurveTo(canvas.width, 0, canvas.width, borderRadius);
          ctx.lineTo(canvas.width, canvas.height - borderRadius);
          ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - borderRadius, canvas.height);
          ctx.lineTo(borderRadius, canvas.height);
          ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - borderRadius);
          ctx.lineTo(0, borderRadius);
          ctx.quadraticCurveTo(0, 0, borderRadius, 0);
          ctx.closePath();
          ctx.fill();
      
          // Text color
          ctx.fillStyle = isGreen ? "#ffffff" : "#000000";
          ctx.font = "bold 22px Arial";
          ctx.textAlign = "center";
      
          nameLines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, topMargin + i * lineHeight);
          });
      
          // QR image
          const qrY = topMargin + nameLines.length * lineHeight + spacing;
          const qrX = padding;
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
      
          // White or Black borders
          ctx.strokeStyle = isGreen ? "#ffffff" : "#000000";
          const lineLength = 25;
          const lineWidth = 4;
          ctx.lineWidth = lineWidth;
      
          const drawCorner = (x1, y1, x2, y2, x3, y3) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.stroke();
          };
      
          drawCorner(qrX, qrY + lineLength, qrX, qrY, qrX + lineLength, qrY);
          drawCorner(qrX + qrSize - lineLength, qrY, qrX + qrSize, qrY, qrX + qrSize, qrY + lineLength);
          drawCorner(qrX, qrY + qrSize - lineLength, qrX, qrY + qrSize, qrX + lineLength, qrY + qrSize);
          drawCorner(
            qrX + qrSize - lineLength,
            qrY + qrSize,
            qrX + qrSize,
            qrY + qrSize,
            qrX + qrSize,
            qrY + qrSize - lineLength
          );
      
          let bottomY = qrY + qrSize + 30;
          ctx.font = "18px Arial";
          ctx.fillText(item.MachineCode || "Code", canvas.width / 2, bottomY);
      
          bottomY += 25;
          ctx.font = "16px Arial";
          ctx.fillText(`Supplier: ${item.SupplierName || "N/A"}`, canvas.width / 2, bottomY);
      
          bottomY += 22;
          const formattedDate = item.PurchaseDate
            ? new Date(item.PurchaseDate).toLocaleDateString("en-GB")
            : "N/A";
          ctx.fillText(`Purchase: ${formattedDate}`, canvas.width / 2, bottomY);
      
          return canvas.toDataURL("image/png", 1.0);
        };
      
        // Show modal with toggle
        let currentTheme = "green";
        let finalImage = await generateQRImage(currentTheme);
      
        const { value: formValues } = await Swal.fire({
          title: `${item.MachineName || "Machine"} QR Code`,
          html: `
            <div class="d-flex m-auto" style="margin-bottom:10px;">
              <select id="qrTheme" class="swal2-select mb-5" style="width:100%;padding:5px;border-radius:6px;">
                <option value="green" selected>Green Theme</option>
                <option value="bw">Black & White</option>
              </select>
            </div>
            <img id="qrPreview" src="${finalImage}" alt="QR Code" style="max-width:100%; border-radius:12px; box-shadow:0 4px 10px rgba(0,0,0,0.3);" />
          `,
          showCancelButton: true,
          confirmButtonText: 'Download <i class="fa-regular fa-circle-down"></i>',
          cancelButtonText: "Cancel",
          willOpen: () => {
            const themeSelect = Swal.getPopup().querySelector("#qrTheme");
            const previewImg = Swal.getPopup().querySelector("#qrPreview");
            themeSelect.addEventListener("change", async (e) => {
              currentTheme = e.target.value === "bw" ? "bw" : "green";
              previewImg.src = await generateQRImage(currentTheme);
            });
          },
          preConfirm: async () => {
            const link = document.createElement("a");
            link.href = await generateQRImage(currentTheme);
            link.download = `QR_${item.MachineCode || "Machine"}_${item.MachineId}_${currentTheme}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          },
        });
      };
      

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "readytooperate":
                return "badge-light-primary";
            case "live":
                return "badge-light-success";
            case "breakdown":
                return "badge-light-danger";
            case "idle":
                return "badge-light-info";
            default:
                return "badge-light";
        }
    };

    const handleDeleteMachine = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete machine?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        UpdatedBy: sessionUserData.Id,
                        MachineId: item.MachineId,
                        FilePath: item.ImageUrls
                    };

                    const response = await fetchWithAuth(`PMMS/InactiveMachines`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        fetchMachines();
                        Swal.fire("Success!", "Machine has been deleted.", "success");
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete user.", "error");
                    }
                } catch (error) {
                    console.error("Error during user delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    const togglePanel = (id) => {
        setOpenPanelId((prevId) => (prevId === id ? null : id));
    };

    const showAddBtn = sessionActionIds?.includes(1);
    const showViewBtn = sessionActionIds?.includes(2);
    const showEditBtn = sessionActionIds?.includes(3);
    const showDwnQRBtn = sessionActionIds?.includes(9);
    const showDeleteBtn = sessionActionIds?.includes(11);

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Machines List</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Machines</li>
                        </ul>
                    </div>
                    {showAddBtn &&
                        <div className="d-flex align-items-center gap-2 gap-lg-3">
                            <a
                                className="btn btn-primary d-none d-md-block btn-sm"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAdd"
                                aria-controls="offcanvasRightAdd">Add
                            </a>
                            <a
                                className="btn btn-light-primary btn-sm d-block d-md-none btn-sm"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAdd"
                                aria-controls="offcanvasRightAdd"><i className="fa-solid fa-plus fs-2"></i>
                            </a>

                            {/* <a
                                className={`btn btn-info btn-sm d-none d-md-block `}
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightMacBulkUploadExcel"
                                aria-controls="offcanvasRightMacBulkUploadExcel"><i class="fa-solid fa-cloud-arrow-up"></i> Bulk Upload
                            </a>
                            <a
                                className={`btn btn-light-info btn-sm d-block d-md-none `}
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightMacBulkUploadExcel"
                                aria-controls="offcanvasRightMacBulkUploadExcel"><i class="fa-solid fa-cloud-arrow-up"></i>
                            </a> */}
                        </div>
                    }
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card-toolbar mb-2">
                        <div className="row d-flex justify-content-start align-items-end">
                            <div className="col-12 col-md-3">
                                <label className="form-label">
                                    Department <span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Select Department"
                                    className="w-100"
                                    value={selectedDeptId || undefined}
                                    style={{ height: "3rem" }}
                                    onChange={(value) => setSelectedDeptId(value)}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {departmentsData?.map((dep) => (
                                        <Option key={dep.Id} value={dep.Id}>
                                            {dep.DeptName}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div className="col-12 col-md-4">
                                <label className="form-label">
                                    Machine <span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Select Machine"
                                    className="w-100"
                                    value={selectedMCNId || undefined}
                                    style={{ height: "3rem" }}
                                    onChange={(value) => setSelectedMCNId(value)}
                                    filterOption={(input, option) => {
                                        const text = `${option?.children}`.toLowerCase();
                                        return text.includes(input.toLowerCase());
                                    }}
                                >
                                    {machinessDDData?.map((mcn) => (
                                        <Option key={mcn.Id} value={mcn.MachineId}>
                                            {mcn.MachineName} - {mcn.MachineCode}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div className="col-12 col-md-1 d-flex">
                                <button
                                    className="btn btn-light-primary btn-sm border border-primary w-100 w-md-auto"
                                    type="button"
                                    style={{ height: "2.6rem", fontSize: "0.9rem" }}
                                    onClick={handleFilterSubmit}
                                    // disabled={loading}
                                    disabled={
                                        loading ||
                                        (selectedDeptId === lastFilters.deptId &&
                                         selectedMCNId === lastFilters.machineId)
                                    }
                                >
                                    {loading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="card d-md-block d-none mt-1">
                        <div className="card-body pt-0">
                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-5" id="kt_customers_table">
                                    <thead>
                                        <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                            <th className="">S.No</th>
                                            <th className="min-w-125px">Name</th>
                                            <th className="min-w-125px">Code</th>
                                            <th className="min-w-125px">Department</th>
                                            <th className="min-w-125px">Installed On</th>
                                            <th className="min-w-100px">Next Maintenance</th>
                                            <th className="min-w-100px">Status</th>
                                            <th className="">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="8" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                        ) : machinesData && machinesData.length > 0 ? (
                                            machinesData.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                    <td>
                                                        <a
                                                            className="text-gray-800 text-hover-primary mb-1 cursor-pointer"
                                                            title={item.MachineName}
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightView"
                                                            aria-controls="offcanvasRightView"
                                                            onClick={() => handleView(item)}
                                                        >{item?.MachineName.length > 28 ? item?.MachineName.slice(0, 28) + '...' : item.MachineName}</a>
                                                    </td>
                                                    <td>
                                                        <a href="#" className="text-gray-600 text-hover-primary mb-1">{item.MachineCode}</a>
                                                    </td>
                                                    <td>{item.DeptName || 'N/A'}</td>
                                                    <td className="text-info">
                                                        {new Date(item.InstallationDate).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td className="text-info">
                                                        {new Date(item.UpcomingMaintenanceDate).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(item.Status)}`}>
                                                            {item.Status}
                                                        </span>
                                                    </td>
                                                    <td className="">
                                                        <Popover
                                                            placement="bottom"
                                                            trigger="hover"
                                                            content={
                                                                <div style={{ width: '8rem' }}>
                                                                    <p
                                                                        style={{
                                                                            cursor: showViewBtn ? 'pointer' : 'not-allowed',
                                                                            opacity: showViewBtn ? 1 : 0.5,
                                                                            pointerEvents: showViewBtn ? 'auto' : 'none',
                                                                            filter: showViewBtn ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-warning"
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightView"
                                                                        aria-controls="offcanvasRightView"
                                                                        onClick={() => handleView(item)}
                                                                    >
                                                                        <i className="fa-regular fa-eye me-2"></i>
                                                                        View
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            cursor: showEditBtn ? 'pointer' : 'not-allowed',
                                                                            opacity: showEditBtn ? 1 : 0.5,
                                                                            pointerEvents: showEditBtn ? 'auto' : 'none',
                                                                            filter: showEditBtn ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-warning"
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightEdit"
                                                                        aria-controls="offcanvasRightEdit"
                                                                        onClick={() => handleEdit(item)}
                                                                    >
                                                                        <i className="fa-regular fa-pen-to-square me-2 text-info"></i>
                                                                        Edit
                                                                    </p>
                                                                    <p
                                                                        style={{ cursor: 'pointer' }}
                                                                        className="text-hover-warning"
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightParts"
                                                                        aria-controls="offcanvasRightParts"
                                                                        onClick={() => handleParts(item)}
                                                                    >
                                                                        <i className="fa-solid fa-diagram-project me-2"></i>
                                                                        Spare Parts
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            cursor: showDwnQRBtn ? 'pointer' : 'not-allowed',
                                                                            opacity: showDwnQRBtn ? 1 : 0.5,
                                                                            pointerEvents: showDwnQRBtn ? 'auto' : 'none',
                                                                            filter: showDwnQRBtn ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-warning"
                                                                        onClick={() => handlegenerateQRCode(item)}
                                                                    >
                                                                        <i className="fa-solid fa-qrcode text-primary me-2"></i>
                                                                        QR Code
                                                                    </p>
                                                                    <p
                                                                        style={{ cursor: 'pointer' }}
                                                                        className="text-hover-warning"
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightAlertAdd"
                                                                        aria-controls="offcanvasRightAlertAdd"
                                                                        onClick={() => handleAlert(item)}
                                                                    >
                                                                        <i className="fa-regular fa-bell text-warning me-2"></i>
                                                                        Alerts
                                                                    </p>
                                                                    <p
                                                                        style={{
                                                                            cursor: showDeleteBtn ? 'pointer' : 'not-allowed',
                                                                            opacity: showDeleteBtn ? 1 : 0.5,
                                                                            pointerEvents: showDeleteBtn ? 'auto' : 'none',
                                                                            filter: showDeleteBtn ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className="text-hover-warning"
                                                                        onClick={() => showDeleteBtn && handleDeleteMachine(item)}
                                                                    >
                                                                        <i className="fa-regular fa-trash-can text-danger me-2"></i>
                                                                        Delete
                                                                    </p>
                                                                </div>
                                                            }
                                                        >
                                                            <button
                                                                className="btn"
                                                            >
                                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                                            </button>
                                                        </Popover>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="text-center">
                                                    <p>No Data Available</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => fetchMachines(page)}
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
                                                {openPanelId === item.MachineId && (
                                                    <div className="d-flex align-items-center gap-2 slide-panel">
                                                        <i
                                                            className="fa-regular fa-eye"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightView"
                                                            aria-controls="offcanvasRightView"
                                                            onClick={() => handleView(item)}
                                                        ></i>
                                                        <i
                                                            className="fa-regular fa-pen-to-square text-info"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightEdit"
                                                            aria-controls="offcanvasRightEdit"
                                                            onClick={() => handleEdit(item)}
                                                        ></i>
                                                        <i
                                                            className="fa-solid fa-diagram-project"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightParts"
                                                            aria-controls="offcanvasRightParts"
                                                            onClick={() => handleParts(item)}
                                                        ></i>
                                                        <i
                                                            className="fa-solid fa-qrcode text-primary"
                                                            onClick={() => handlegenerateQRCode(item)}
                                                        ></i>
                                                        <i
                                                            className="fa-regular fa-bell text-warning"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightAlertAdd"
                                                            aria-controls="offcanvasRightAlertAdd"
                                                            onClick={() => handleAlert(item)}
                                                            disabled={true}
                                                        ></i>
                                                        <i
                                                            className="fa-regular fa-trash-can text-danger"
                                                            onClick={() => handleDeleteMachine(item)}
                                                            style={{ cursor: "pointer" }}
                                                        ></i>
                                                    </div>
                                                )}

                                                <span className="arrow-container text-muted" style={{ fontSize: '1.1rem' }}>
                                                    |
                                                    <i
                                                        className={`fa-solid ${openPanelId === item.MachineId ? 'fa-arrow-right' : 'fa-arrow-left'} ${openPanelId !== item.MachineId ? 'bounce-left' : ''}`}
                                                        onClick={() => togglePanel(item.MachineId)}
                                                        style={{ cursor: "pointer", marginLeft: "8px" }}
                                                    ></i>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Name:</span>
                                                <span className="fw-semibold">{item?.MachineName.length > 25 ? item?.MachineName.slice(0, 25) + '...' : item.MachineName}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Code:</span>
                                                <span className="fw-semibold">{item.MachineCode || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Department:</span>
                                                <span className="fw-semibold">{item.DeptName || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Instalation:</span>
                                                <span className="fw-semibold text-success">{new Date(item.InstallationDate).toLocaleDateString('en-GB')}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Next Maintenance:</span>
                                                <span className="fw-semibold text-info">{new Date(item.UpcomingMaintenanceDate).toLocaleDateString('en-GB')}</span>
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
                            onPageChange={(page) => fetchMachines(page)}
                        />
                    </div>
                </div>
            </div>

            <style>
                {`
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

            <RegisterMachine />
            <ViewMachine viewObj={viewData} />
            <MachineParts partsObj={partsData} />
            <EditMachine editObj={editData} />
            <AddAlert machineId={alertData?.MachineId} />
            <MachinesBulkUplaodExcel />

        </Base1>
    )
}