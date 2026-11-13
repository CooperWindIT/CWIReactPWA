import React, { useEffect, useState } from "react";
import "../items/ItemView.css";

/**
 * In-page image preview (no new tab).
 * <ImagePreviewModal image={{ url, title, subtitle, note }} onClose={() => ...} />
 */
const ImagePreviewModal = ({ image, onClose }) => {
    const [zoomed, setZoomed] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setZoomed(false);
        setFailed(false);
    }, [image?.url]);

    useEffect(() => {
        if (!image) return;
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [image, onClose]);

    if (!image) return null;

    return (
        <div className="ipm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ipm-dialog" role="dialog" aria-modal="true" aria-label={image.title || "Image preview"}>

                <div className="ipm-head">
                    <span className="ipm-icon"><i className="fa-regular fa-image" /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="ipm-title">{image.title || "Image"}</div>
                        {image.subtitle && <div className="ipm-sub">{image.subtitle}</div>}
                    </div>
                    {!failed && (
                        <button
                            type="button"
                            className="ipm-btn"
                            onClick={() => setZoomed(z => !z)}
                            title={zoomed ? "Fit to window" : "Actual size"}
                        >
                            <i className={`fa-solid ${zoomed ? "fa-compress" : "fa-expand"}`} />
                        </button>
                    )}
                    <button type="button" className="ipm-btn" onClick={onClose} title="Close (Esc)">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className={`ipm-stage ${zoomed ? "zoomed" : ""}`}>
                    {failed ? (
                        <div className="ipm-error">
                            <i className="fa-regular fa-image" />
                            <span>Image could not be loaded.</span>
                        </div>
                    ) : (
                        <img
                            src={image.url}
                            alt={image.title || "Preview"}
                            onClick={() => setZoomed(z => !z)}
                            onError={() => setFailed(true)}
                        />
                    )}
                </div>

                {image.note && (
                    <div className="ipm-note">
                        <i className="fa-solid fa-quote-left" />
                        <span>{image.note}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImagePreviewModal;