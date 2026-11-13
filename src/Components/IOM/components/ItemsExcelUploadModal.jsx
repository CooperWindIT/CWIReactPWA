import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { downloadItemsExcel, uploadItemsExcel } from "../services/services";
import { readXlsx } from "./readXlsx";
import "./ItemsExcelUploadModal.css";

const MAX_SIZE = 10 * 1024 * 1024;          // 10 MB
const ALLOWED = /\.(xlsx|xls)$/i;

// Template columns (from IIM/ItemsRegdownloadexcel)
const EXPECTED = ["ItemCode", "ItemName", "Description", "PartNO"];
const REQUIRED = ["ItemCode", "ItemName"];
const PREVIEW_LIMIT = 200;
const norm = (h) => String(h || "").replace(/\s+/g, "").toLowerCase();

const formatSize = (bytes) =>
    bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// data.result[0] -> { Message, InsertedRecords, UpdatedRecords, DuplicateRecords, DuplicateItemCodes }
const readSummary = (data) => {
    const r = (Array.isArray(data?.result) ? data.result[0] : Array.isArray(data) ? data[0] : data) || {};
    const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v) || 0);
    let dupCodes = r.DuplicateItemCodes ?? [];
    if (typeof dupCodes === "string") dupCodes = dupCodes.split(",");
    dupCodes = (Array.isArray(dupCodes) ? dupCodes : []).map(c => String(c).trim()).filter(Boolean);
    return {
        message: r.Message || "",
        inserted: num(r.InsertedRecords),
        updated: num(r.UpdatedRecords),
        duplicates: num(r.DuplicateRecords),
        dupCodes
    };
};

/**
 * Bulk item upload
 * 1. Download the Excel template  (GET IIM/ItemsRegdownloadexcel)
 * 2. Fill it and upload           (POST IIM/uploadItemsExcel – OrgId, UserId, Action "ADD", file)
 *
 * <ItemsExcelUploadModal show orgId userId onClose onUploaded />
 */
const ItemsExcelUploadModal = ({ show, orgId, userId, onClose, onUploaded }) => {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);    // { ok, message, counts, rows }
    const [preview, setPreview] = useState(null);  // { headers, rows, missing, incomplete, error, loading }

    useEffect(() => {
        if (show) { setFile(null); setResult(null); setPreview(null); setDragOver(false); }
    }, [show]);

    useEffect(() => {
        if (!show) return;
        const onKey = (e) => { if (e.key === "Escape" && !uploading) onClose?.(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [show, uploading, onClose]);

    if (!show) return null;

    const pickFile = (f) => {
        if (!f) return;
        if (!ALLOWED.test(f.name)) {
            Swal.fire("Warning", "Please choose an Excel file (.xlsx or .xls)", "warning");
            return;
        }
        if (f.size > MAX_SIZE) {
            Swal.fire("Warning", "File must be 10 MB or smaller", "warning");
            return;
        }
        setFile(f);
        setResult(null);
        buildPreview(f);
    };

    // Read the sheet and show the columns + values before uploading
    const buildPreview = async (f) => {
        setPreview({ loading: true });
        try {
            const { headers, rows } = await readXlsx(f);
            const have = headers.map(norm);
            const missing = EXPECTED.filter(h => !have.includes(norm(h)));
            const reqIdx = REQUIRED.map(h => have.indexOf(norm(h))).filter(i => i >= 0);
            const incomplete = rows.filter(r => reqIdx.some(i => !r[i])).length;
            setPreview({ headers, rows, missing, incomplete, reqIdx });
        } catch (err) {
            const msg = err?.message === "XLS_NOT_SUPPORTED"
                ? "Preview is available for .xlsx files only. You can still upload this file."
                : "Could not read this file for preview. You can still upload it.";
            setPreview({ error: msg });
        }
    };

    const removeFile = () => { setFile(null); setPreview(null); };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            const { blob, fileName } = await downloadItemsExcel();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
            console.error("Download items Excel Error:", err);
            Swal.fire("Error", err?.message || "Could not download the template", "error");
        } finally {
            setDownloading(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);
        try {
            const res = await uploadItemsExcel({ orgId, userId, file, action: "ADD" });
            const ok =
                (res?.status === 200 && String(res?.result).toLowerCase() === "success") ||
                res?.success === true;
            const summary = readSummary(res?.data);
            const message = res?.response || summary.message || res?.message || (ok ? "Items uploaded successfully." : "Upload failed.");
            setResult({ ok, message, ...summary });
            if (ok) {
                setFile(null);
                setPreview(null);
                await onUploaded?.();
            }
        } catch (err) {
            console.error("Upload items Excel Error:", err);
            setResult({ ok: false, message: err?.message || "Failed to upload the Excel file", dupCodes: [] });
        } finally {
            setUploading(false);
        }
    };

    const wide = !!(preview && preview.headers && preview.headers.length);
    const noRows = !!(preview && preview.headers && preview.rows.length === 0);

    return (
        <div className="ir-page xu-root">
        <div className="ir-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !uploading) onClose?.(); }}>
            <div className={`ir-modal xu-modal ${wide ? "xu-wide" : ""}`} role="dialog" aria-modal="true" aria-label="Upload items from Excel">
                <div className="ir-modal-head">
                    <div>
                        <div className="ir-modal-title">Upload items from Excel</div>
                        <div className="ir-modal-sub">Download the template, fill in the items, then upload it.</div>
                    </div>
                    <button type="button" className="ir-modal-close" disabled={uploading} onClick={onClose} title="Close">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="ir-modal-body">
                    {/* STEP 1 */}
                    <div className="xu-step">
                        <span className="xu-step-no">1</span>
                        <div className="xu-step-text">
                            <b>Download the template</b>
                            <small>Keep the column headings as they are.</small>
                        </div>
                        <button type="button" className="ir-btn-ghost xu-dl" disabled={downloading} onClick={handleDownload}>
                            {downloading
                                ? <><span className="spinner-border spinner-border-sm" /> Downloading…</>
                                : <><i className="fa-solid fa-file-arrow-down" /> Download</>}
                        </button>
                    </div>

                    {/* STEP 2 */}
                    <div className="xu-step">
                        <span className="xu-step-no">2</span>
                        <div className="xu-step-text">
                            <b>Upload the filled file</b>
                            <small>Excel (.xlsx, .xls) · up to 10 MB</small>
                        </div>
                    </div>

                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        hidden
                        onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ""; }}
                    />

                    {file ? (
                        <div className="xu-file">
                            <span className="xu-file-icon"><i className="fa-solid fa-file-excel" /></span>
                            <div className="xu-file-text">
                                <b title={file.name}>{file.name}</b>
                                <small>{formatSize(file.size)}</small>
                            </div>
                            <button type="button" className="ir-btn-ghost ir-btn-sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                                Change
                            </button>
                            <button type="button" className="xu-remove" disabled={uploading} onClick={removeFile} title="Remove">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className={`xu-drop ${dragOver ? "over" : ""}`}
                            onClick={() => fileRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                        >
                            <i className="fa-solid fa-cloud-arrow-up" />
                            <b>Click to choose a file</b>
                            <small>or drag and drop it here</small>
                        </button>
                    )}

                    {/* PREVIEW */}
                    {file && preview?.loading && (
                        <div className="xu-preview-msg"><span className="spinner-border spinner-border-sm me-2" />Reading file…</div>
                    )}
                    {file && preview?.error && (
                        <div className="xu-preview-msg warn"><i className="fa-solid fa-circle-info" /> <span>{preview.error}</span></div>
                    )}
                    {file && preview?.headers && (
                        <div className="xu-preview">
                            <div className="xu-preview-head">
                                <b>Preview</b>
                                <span>{preview.rows.length} row{preview.rows.length === 1 ? "" : "s"} · {preview.headers.length} columns</span>
                            </div>

                            {preview.missing.length > 0 && (
                                <div className="xu-preview-msg warn">
                                    <i className="fa-solid fa-triangle-exclamation" />
                                    <span>Missing column{preview.missing.length === 1 ? "" : "s"}: <b>{preview.missing.join(", ")}</b>. Please use the downloaded template.</span>
                                </div>
                            )}
                            {preview.incomplete > 0 && (
                                <div className="xu-preview-msg warn">
                                    <i className="fa-solid fa-triangle-exclamation" />
                                    <span>{preview.incomplete} row{preview.incomplete === 1 ? " has" : "s have"} an empty {REQUIRED.join(" / ")} (highlighted).</span>
                                </div>
                            )}
                            {noRows && (
                                <div className="xu-preview-msg warn">
                                    <i className="fa-solid fa-triangle-exclamation" /> <span>The sheet has headings but no item rows.</span>
                                </div>
                            )}

                            {!noRows && (
                                <div className="xu-table-wrap">
                                    <table className="xu-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                {preview.headers.map((h, i) => <th key={i}>{h}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preview.rows.slice(0, PREVIEW_LIMIT).map((r, ri) => (
                                                <tr key={ri}>
                                                    <td className="xu-idx">{ri + 1}</td>
                                                    {r.map((v, ci) => (
                                                        <td key={ci} className={!v && preview.reqIdx.includes(ci) ? "xu-empty" : ""}>
                                                            {v || <span className="xu-dash">—</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {preview.rows.length > PREVIEW_LIMIT && (
                                <div className="xu-preview-more">Showing the first {PREVIEW_LIMIT} of {preview.rows.length} rows. All rows will be uploaded.</div>
                            )}
                        </div>
                    )}

                    {/* RESULT */}
                    {result && (
                        <div className={`xu-result ${result.ok ? "ok" : "err"}`}>
                            <div className="xu-result-msg">
                                <i className={`fa-solid ${result.ok ? "fa-circle-check" : "fa-circle-xmark"}`} />
                                <span>{result.message}</span>
                            </div>
                            {(result.inserted !== null || result.updated !== null || result.duplicates !== null) && (
                                <div className="xu-stats">
                                    <div className="xu-stat added">
                                        <i className="fa-solid fa-circle-plus" />
                                        <b>{result.inserted ?? 0}</b>
                                        <small>Added</small>
                                    </div>
                                    <div className="xu-stat updated">
                                        <i className="fa-solid fa-pen-to-square" />
                                        <b>{result.updated ?? 0}</b>
                                        <small>Updated</small>
                                    </div>
                                    <div className={`xu-stat dup ${result.duplicates ? "has" : ""}`}>
                                        <i className="fa-solid fa-clone" />
                                        <b>{result.duplicates ?? 0}</b>
                                        <small>Duplicates</small>
                                    </div>
                                </div>
                            )}
                            {result.dupCodes?.length > 0 && (
                                <div className="xu-dups">
                                    <small>Already exist, not added:</small>
                                    <div className="xu-dup-codes">
                                        {result.dupCodes.map(c => <span key={c}>{c}</span>)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="ir-modal-foot">
                    <button type="button" className="ir-btn-ghost" disabled={uploading} onClick={onClose}>
                        {result?.ok ? "Done" : "Cancel"}
                    </button>
                    <button
                        type="button"
                        className="ir-btn-soft xu-submit"
                        disabled={!file || uploading || preview?.loading || noRows}
                        onClick={handleUpload}
                    >
                        {uploading
                            ? <><span className="spinner-border spinner-border-sm" /> Uploading…</>
                            : <><i className="fa-solid fa-upload" /> Upload{preview?.rows?.length ? ` ${preview.rows.length} item${preview.rows.length === 1 ? "" : "s"}` : ""}</>}
                    </button>
                </div>
            </div>
        </div>
        </div>
    );
};

export default ItemsExcelUploadModal;