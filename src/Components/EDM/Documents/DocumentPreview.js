import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { fetchWithAuth } from '../../../utils/api';
import { BASE_DOCS_API_GET } from '../../Config/Config';
import LZString from "lz-string";

const DocumentPreview = ({ isOpen, onClose, filePath, docName, sessionUserData, itemData }) => {

    const [previewError, setPreviewError] = useState(false);
    const [zoom, setZoom] = useState(1);

    const MIN_ZOOM = 0.3;
    const MAX_ZOOM = 3;
    const ZOOM_STEP = 0.1;

    const zoomIn = () => setZoom((z) => Math.min(+(z + ZOOM_STEP).toFixed(2), MAX_ZOOM));
    const zoomOut = () => setZoom((z) => Math.max(+(z - ZOOM_STEP).toFixed(2), MIN_ZOOM));
    const zoomReset = () => setZoom(1);

    // Effect to handle body scroll lock
    useEffect(() => {
        document.body.style.overflow = isOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    // Handle Audit Logging when preview opens
    useEffect(() => {
        if (isOpen && itemData) {
            logPreviewAction();
        }
    }, [isOpen]);

    // Reset zoom + error state whenever a new file is opened
    useEffect(() => {
        if (isOpen) {
            setPreviewError(false);
            setZoom(1);
        }
    }, [isOpen, filePath]);

    // Reusable wrapper: outer frame stays put, inner layer scrolls independently
    const ScrollFrame = ({ children }) => (
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
            <ZoomControls />
            <div style={{ position: "absolute", inset: 0, overflow: "auto" }}>
                {children}
            </div>
        </div>
    );

    const logPreviewAction = async () => {
        try {
            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const logPayload = {
                TicketId: 0,
                Status: itemData.VersionStatus || "",
                Logs: `Document previewed: ${docName || 'Unknown'} (v${itemData.VersionNumber || '1'})`,
                LogDate: new Date().toISOString().slice(0, 19).replace("T", " "),
                ChangedBy: sessionUserData?.Id,
                ModuleId: storedModule?.Id?.toString(),
                EntityId: itemData.Id,
                EntityType: "Documents",
            };
            await fetchWithAuth(`Portal/AddLogs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(logPayload),
            });
        } catch (error) {
            console.error("Audit Log failed:", error);
        }
    };

    const getFileUrl = (path) => {
        if (!path) return "";
        return path.startsWith("http") ? path : `${BASE_DOCS_API_GET}${path}`;
    };

    // Reusable floating zoom control bar
    const ZoomControls = () => (
        <div
            style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 1000,
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.9)",
                borderRadius: 8,
                padding: "4px 6px",
                boxShadow: "0 2px 8px rgba(0,0,0,.12)",
            }}
        >
            <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
                title="Zoom out"
            >
                <i className="bi bi-zoom-out"></i>
            </button>

            <span className="fw-semibold text-muted" style={{ fontSize: "0.75rem", minWidth: 38, textAlign: "center" }}>
                {Math.round(zoom * 100)}%
            </span>

            <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
                title="Zoom in"
            >
                <i className="bi bi-zoom-in"></i>
            </button>

            <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={zoomReset}
                title="Reset zoom"
            >
                <i className="bi bi-arrow-counterclockwise"></i>
            </button>
        </div>
    );

    const ErrorFallback = ({ fileUrl, isUnsupported = false }) => {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 px-4 text-center">
                <div className="bg-light-danger p-4 rounded-circle mb-3">
                    <i className={`fa-solid ${isUnsupported ? 'fa-file-circle-exclamation' : 'fa-circle-xmark'} text-danger fs-1`}></i>
                </div>

                <h4 className="fw-bold text-dark">
                    {isUnsupported ? "Format Not Supported" : "Failed to Open Preview"}
                </h4>

                <p className="text-muted mb-4 mx-auto" style={{ maxWidth: "400px" }}>
                    We couldn't load the preview for this document. This may be due to a network issue or file permissions.
                    <strong> An audit log for this attempt has been generated.</strong>
                </p>

                <div className="d-flex gap-2">
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary shadow-sm">
                        <i className="bi bi-download me-2"></i> Download File
                    </a>
                    <button
                        className="btn btn-outline-secondary"
                        onClick={() => window.open(`mailto:admin@yourorg.com?subject=Issue with document preview: ${fileUrl}`)}
                    >
                        Contact Admin
                    </button>
                </div>

                <small className="mt-4 text-muted fst-italic">
                    Ref: ${new Date().getTime()}
                </small>
            </div>
        );
    };

    const FlowChartPreview = ({ jsonData }) => {
        let diagram = null;

        try {
            const json = LZString.decompressFromBase64(jsonData);
            diagram = JSON.parse(json);
        } catch (err) {
            return (
                <div className="text-center p-5 text-danger">
                    Unable to load flow chart.
                </div>
            );
        }

        return (
            <ScrollFrame>
                <div
                    style={{
                        position: "relative",
                        width: "3000px",
                        height: "3000px",
                        transform: `scale(${zoom})`,
                        transformOrigin: "0 0",
                        background: "#fafafa",
                    }}
                >
                    <svg
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "3000px",
                            height: "3000px",
                            pointerEvents: "none",
                        }}
                    >
                        {diagram.connections.map((con) => {
                            const from = diagram.nodes.find(n => n.id === con.from);
                            const to = diagram.nodes.find(n => n.id === con.to);
                            if (!from || !to) return null;
                            return (
                                <line
                                    key={con.id}
                                    x1={from.x + from.w / 2}
                                    y1={from.y + from.h / 2}
                                    x2={to.x + to.w / 2}
                                    y2={to.y + to.h / 2}
                                    stroke="#1677ff"
                                    strokeWidth="2"
                                />
                            );
                        })}
                    </svg>

                    {diagram.nodes.map((node) => (
                        <div
                            key={node.id}
                            style={{
                                position: "absolute",
                                left: node.x,
                                top: node.y,
                                width: node.w,
                                height: node.h,
                                border: "2px solid #1677ff",
                                borderRadius:
                                    node.shape === "rounded" ? 20 : node.shape === "circle" ? "50%" : 6,
                                background: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 600,
                                fontSize: node.fontSize,
                                fontFamily: node.fontFamily,
                                boxShadow: "0 3px 10px rgba(0,0,0,.08)",
                            }}
                        >
                            {node.label}
                        </div>
                    ))}
                </div>
            </ScrollFrame>
        );
    };

    const renderPreview = () => {

        if (itemData?.JsonData) {
            return <FlowChartPreview jsonData={itemData.JsonData} />;
        }

        if (!filePath) return null;
        if (previewError) return <ErrorFallback fileUrl={getFileUrl(filePath)} />;

        const fileUrl = getFileUrl(filePath);
        const extension = filePath.split(".").pop().toLowerCase();

        // 1. PDF
        if (extension === "pdf") {
            return (
                <ScrollFrame>
                    <div
                        style={{
                            width: `${100 / zoom}%`,
                            height: `${100 / zoom}%`,
                            transform: `scale(${zoom})`,
                            transformOrigin: "0 0",
                        }}
                    >
                        <object data={fileUrl} type="application/pdf" width="100%" height="100%">
                            <iframe src={fileUrl} width="100%" height="100%" title="PDF Fallback" />
                        </object>
                    </div>
                </ScrollFrame>
            );
        }

        // 2. Images
        if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
            return (
                <ScrollFrame>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            justifyContent: "center",
                            background: "#f8f9fa",
                            minHeight: "100%",
                        }}
                    >
                        <img
                            src={fileUrl}
                            alt="Preview"
                            style={{
                                transform: `scale(${zoom})`,
                                transformOrigin: "top center",
                                maxWidth: "100%",
                                transition: "transform 0.15s ease-out",
                            }}
                            onError={() => setPreviewError(true)}
                        />
                    </div>
                </ScrollFrame>
            );
        }

        // 3. Office Docs (zoom not applicable — external embed controls its own view)
        if (["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(extension)) {
            return (
                <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                    width="100%" height="100%" frameBorder="0" title="Office Preview"
                />
            );
        }

        // 4. Text Files
        if (["txt", "md", "json", "xml", "csv"].includes(extension)) {
            return (
                <ScrollFrame>
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}>
                        <TextContent fileUrl={fileUrl} />
                    </div>
                </ScrollFrame>
            );
        }

        // Fallback
        return (
            <div className="text-center text-muted py-5">
                <i className="fa-solid fa-file fs-1 mb-3"></i>
                <p>Preview not available</p>
                <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">Download</a>
            </div>
        );

    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="preview-modal-backdrop">
            <div className="preview-modal animate-scale-in">
                <div className="modal-header border-0 px-4 py-3 d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                        <i className="fa-solid fa-file-lines text-primary fs-4"></i>
                        <h5 className="modal-title mb-0 fw-bold">{docName || "Document Preview"}</h5>
                        <span className="badge bg-light text-dark border">
                            {filePath?.split(".").pop().toUpperCase()}
                        </span>
                    </div>
                    <button type="button" className="btn-close" onClick={onClose}></button>
                </div>
                <div className="border-top"></div>
                <div className="modal-body p-0">
                    <div className="preview-container" style={{ position: "relative" }}>
                        {renderPreview()}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Internal Helper Component
const TextContent = ({ fileUrl }) => {
    const [text, setText] = useState("");
    useEffect(() => {
        fetch(fileUrl).then(res => res.text()).then(setText);
    }, [fileUrl]);
    return <pre className="p-3 bg-light rounded" style={{ whiteSpace: 'pre-wrap' }}>{text}</pre>;
};

export default DocumentPreview;