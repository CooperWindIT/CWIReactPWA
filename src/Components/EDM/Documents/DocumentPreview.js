import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { fetchWithAuth } from '../../../utils/api';
import { BASE_DOCS_API_GET } from '../../Config/Config';

const DocumentPreview = ({ isOpen, onClose, filePath, docName, sessionUserData, itemData }) => {

    const [previewError, setPreviewError] = useState(false);
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

    useEffect(() => {
        if (isOpen) setPreviewError(false);
    }, [isOpen, filePath]);

    const logPreviewAction = async () => {
        // console.log(itemData);
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
            // Replace with your actual global fetch function
            await fetchWithAuth(`Portal/AddLogs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(logPayload),
            });
        } catch (error) {
            console.error("Audit Log failed:", error);
        }
    };

    // const getFileUrl = (path) => path; // Replace with your actual base URL logic
    const getFileUrl = (path) => {
        if (!path) return "";
        // If the path is already a full URL, return it; otherwise, append the base
        return path.startsWith("http") ? path : `${BASE_DOCS_API_GET}${path}`;
    };

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
    
    const renderPreview = () => {
        if (!filePath) return null;
        if (previewError) return <ErrorFallback fileUrl={getFileUrl(filePath)} />;

        const fileUrl = getFileUrl(filePath);
        const extension = filePath.split(".").pop().toLowerCase();

        // 1. PDF
        // if (extension === "pdf") {
        //     return <iframe src={fileUrl} width="100%" height="100%" title="PDF Preview" />;
        // }

        // Inside renderPreview()
        if (extension === "pdf") {
            return (
                <object
                    data={fileUrl}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                >
                    <iframe src={fileUrl} width="100%" height="100%" title="PDF Fallback" />
                </object>
            );
        }

        // 2. Images
        if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
            return <img src={fileUrl} alt="Preview" className="img-fluid mx-auto d-block" />;
        }

        // 3. Office Docs
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
            return <TextContent fileUrl={fileUrl} />;
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
                            {filePath.split(".").pop().toUpperCase()}
                        </span>
                    </div>
                    <button type="button" className="btn-close" onClick={onClose}></button>
                </div>
                <div className="border-top"></div>
                <div className="modal-body p-0">
                    <div className="preview-container">
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