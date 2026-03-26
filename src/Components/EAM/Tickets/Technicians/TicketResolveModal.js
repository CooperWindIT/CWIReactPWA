import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button, Input } from "antd";

const { TextArea } = Input;

export default function TicketResolveModal({ isOpen, onClose, onSubmit, item }) {
    const [logText, setLogText] = useState("");

    const handleConfirm = () => {
        if (!logText.trim()) {
            return; // You could show a small toast here
        }
        onSubmit(item, logText);
        setLogText("");
    };

    if (!isOpen) return null;

    return (
        <div
            className="modal fade show"
            style={{ 
                display: "block", 
                background: "rgba(0,0,0,0.5)", 
                zIndex: 1100 // High z-index to stay above Offcanvas (1045)
            }}
            tabIndex="-1"
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content shadow-lg border-0">
                    <div className="modal-header bg-white border-bottom">
                        <h5 className="modal-title fw-bold text-gray-800">
                            <i className="bi bi-check2-circle text-success me-2"></i>
                            Resolve Ticket
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        ></button>
                    </div>

                    <div className="modal-body">
                        <div className="card shadow-sm border-0 p-3 rounded-3 bg-light mb-3">
                            <div className="text-start small text-muted">
                                <div className="mb-1">
                                    <strong className="text-dark">Ticket:</strong> {item?.TicketCode}
                                </div>
                                <div>
                                    <strong className="text-dark">Issue:</strong> {item?.IssueType}
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label fw-bold text-gray-700 fs-7">
                                Resolution Details <span className="text-danger">*</span>
                            </label>
                            <TextArea
                                rows={4}
                                placeholder="Explain how the issue was resolved..."
                                value={logText}
                                onChange={(e) => setLogText(e.target.value)}
                                className="rounded-3"
                                style={{ resize: 'none' }}
                            />
                            <div className="form-text fs-9 text-muted mt-2">
                                Provide clear logs for the end-user to review.
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer border-top-0 pt-0">
                        <Button 
                            type="default" 
                            className="px-4 fw-bold" 
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="primary" 
                            className="bg-success border-success px-4 fw-bold"
                            onClick={handleConfirm}
                            disabled={!logText.trim()}
                        >
                            Submit Resolution
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

TicketResolveModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    item: PropTypes.object
};