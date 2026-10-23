// =============================================================
// Register / Edit Feedback Content — offcanvas form
//
// Path: src/Components/CFM/pages/RegisterFeedbackContent.jsx
//
// Same shape as RegisterCustomer: one panel, both jobs.
//
//     <RegisterFeedbackContent
//         offcanvasId="offcanvasRightAddContent"
//         content={editingContent}          // null = add
//         types={types}                     // from Portal/GetMasterTypes
//         orgId={sessionUserData?.OrgId}
//         userId={sessionUserData?.Id}
//         onSaved={fetchContents}
//     />
//
// Display order isn't asked for here — it is sent as null and the order is
// set per request on the setup screen.
// =============================================================

import React, { useEffect, useRef, useState } from "react";
import { Form, Input, Select, Switch, Button, message } from "antd";
import { saveFeedbackContent, readResult } from "../Services/cfmServices";

const { TextArea } = Input;

export default function RegisterFeedbackContent({
    offcanvasId = "offcanvasRightAddContent",
    content = null,
    types = [],
    orgId,
    userId,
    onSaved,
}) {
    const [form] = Form.useForm();

    const offcanvasRef = useRef(null);
    const [submitting, setSubmitting] = useState(false);

    const isEdit = Boolean(content?.Id);

    // -------------------------------------------------------------
    // FILL THE FORM
    //
    // On the open event as well as on the prop, because the panel is mounted
    // once and reused: without the event, opening Add straight after an Edit
    // would still show the previous row.
    // -------------------------------------------------------------

    const fill = () => {
        form.setFieldsValue({
            TypeId: content?.TypeId ?? undefined,
            ContentText: content?.ContentText || "",
            // Sent as 1/0; held as booleans so the switches read naturally.
            IsRequired: content ? Boolean(content.IsRequired) : true,
            IsDefault: content ? Boolean(content.IsDefault) : false,
        });
    };

    useEffect(() => {
        const el = offcanvasRef.current;
        if (!el) return undefined;

        el.addEventListener("show.bs.offcanvas", fill);
        return () => el.removeEventListener("show.bs.offcanvas", fill);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    useEffect(() => {
        fill();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [content]);

    // -------------------------------------------------------------
    // SAVE
    // -------------------------------------------------------------

    const closePanel = () => {
        const el = offcanvasRef.current;
        if (!el) return;

        const OffcanvasApi = window.bootstrap?.Offcanvas;

        const instance =
            OffcanvasApi &&
            (OffcanvasApi.getInstance(el) || OffcanvasApi.getOrCreateInstance(el));

        if (instance) {
            instance.hide();
            return;
        }

        const dismisser = document.createElement("button");
        dismisser.type = "button";
        dismisser.setAttribute("data-bs-dismiss", "offcanvas");
        dismisser.style.display = "none";
        el.appendChild(dismisser);
        dismisser.click();
        dismisser.remove();
    };

    const handleSubmit = async () => {
        let values;

        try {
            values = await form.validateFields();
        } catch (error) {
            return; // errors already shown inline
        }

        try {
            setSubmitting(true);

            const response = await saveFeedbackContent({
                orgId,
                userId,
                content: {
                    Id: content?.Id || 0,
                    TypeId: values.TypeId,
                    ContentText: values.ContentText,
                    IsDefault: values.IsDefault,
                    IsRequired: values.IsRequired,
                    // Not part of this form — the service receives null.
                    DisplayOrder: null,
                },
            });

            const result = readResult(response);

            if (result.ok) {
                message.success(
                    result.message || (isEdit ? "Content updated." : "Content added.")
                );

                form.resetFields();
                closePanel();

                if (typeof onSaved === "function") onSaved();
            } else {
                message.error(result.message || "Could not save the content.");
            }
        } catch (error) {
            console.error("SaveFeedbackMasters failed:", error);
            message.error("Something went wrong while saving.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            ref={offcanvasRef}
            className="offcanvas offcanvas-end cfm-offcanvas"
            tabIndex="-1"
            id={offcanvasId}
            aria-labelledby={`${offcanvasId}Label`}
            style={{ width: "92%" }}
        >
            {/* ---------------- HEADER ---------------- */}

            <div className="cfm-panel-header">
                <div className="d-flex align-items-center">
                    <span className="cfm-panel-badge">
                        <i
                            className={`text-white bi ${
                                isEdit ? "bi-pencil-square" : "bi-chat-left-text-fill"
                            }`}
                        ></i>
                    </span>

                    <div className="ms-3">
                        <h5 id={`${offcanvasId}Label`} className="cfm-panel-title">
                            {isEdit ? "Edit Content" : "Register Content"}
                        </h5>

                        <div className="cfm-panel-sub">
                            {isEdit
                                ? "Update the question and how it behaves"
                                : "Add a question to a type"}
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                ></button>
            </div>

            {/* ---------------- BODY ---------------- */}

            <div className="cfm-panel-body">
                <Form form={form} layout="vertical" size="large" requiredMark>

                    {/* ---- Content ---- */}

                    <div className="cfm-section">
                        <span className="cfm-section-title">Content</span>
                        <span className="cfm-section-rule" />
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-md-7">
                            <Form.Item
                                label="Type"
                                name="TypeId"
                                rules={[
                                    { required: true, message: "Choose a type." },
                                ]}
                            >
                                <Select
                                    showSearch
                                    placeholder="Select a type"
                                    optionFilterProp="label"
                                    notFoundContent={
                                        types.length
                                            ? "No match"
                                            : "No types configured yet"
                                    }
                                    options={types.map((type) => ({
                                        value: type.Id,
                                        label: type.TypeName,
                                    }))}
                                />
                            </Form.Item>
                        </div>

                        <div className="col-12">
                            <Form.Item
                                label="Question / Content Text"
                                name="ContentText"
                                rules={[
                                    { required: true, message: "Content text is required." },
                                    {
                                        min: 5,
                                        message: "Write the question out in full.",
                                    },
                                ]}
                            >
                                <TextArea
                                    rows={3}
                                    maxLength={500}
                                    showCount
                                    placeholder="e.g. How satisfied are you with our service?"
                                />
                            </Form.Item>
                        </div>
                    </div>

                    {/* ---- Behaviour ---- */}

                    <div className="cfm-section">
                        <span className="cfm-section-title">Behaviour</span>
                        <span className="cfm-section-rule" />
                    </div>

                    <div className="cfm-toggle-row">
                        <Form.Item
                            name="IsRequired"
                            valuePropName="checked"
                            className="mb-0"
                        >
                            <Switch />
                        </Form.Item>

                        <div className="cfm-toggle-text">
                            <div className="cfm-toggle-title">Required</div>
                            <div className="cfm-toggle-sub">
                                The person giving feedback cannot submit without
                                answering this.
                            </div>
                        </div>
                    </div>

                    <div className="cfm-toggle-row">
                        <Form.Item
                            name="IsDefault"
                            valuePropName="checked"
                            className="mb-0"
                        >
                            <Switch />
                        </Form.Item>

                        <div className="cfm-toggle-text">
                            <div className="cfm-toggle-title">Default</div>
                            <div className="cfm-toggle-sub">
                                Included automatically whenever this feedback type
                                is used.
                            </div>
                        </div>
                    </div>

                </Form>
            </div>

            {/* ---------------- FOOTER ---------------- */}

            <div className="cfm-panel-footer">
                <Button
                    size="large"
                    className="cfm-btn-ghost"
                    data-bs-dismiss="offcanvas"
                    disabled={submitting}
                >
                    Cancel
                </Button>

                <Button
                    size="large"
                    type="primary"
                    className="cfm-btn-primary"
                    loading={submitting}
                    onClick={handleSubmit}
                >
                    <i className="bi bi-check2-circle me-2 text-white"></i>
                    {isEdit ? "Update Content" : "Save Content"}
                </Button>
            </div>

            {/* ---------------- STYLES ----------------
                 Self-contained on purpose. The panel chrome looks the same as
                 RegisterCustomer's, but that component is only mounted on the
                 Customers screen — relying on its <style> would leave this
                 panel unstyled here. Everything is scoped to this offcanvas
                 id, so having both on one page could never collide either. */}

            <style>{`

                @media (min-width: 768px) {
                    #${offcanvasId} { width: 44% !important; }
                }

                @media (min-width: 1600px) {
                    #${offcanvasId} { width: 36% !important; }
                }

                #${offcanvasId} {
                    display: flex;
                    flex-direction: column;
                    background: #fbfcfe;
                }


                /* ----- Header ----- */

                #${offcanvasId} .cfm-panel-header {
                    flex: none;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 20px 24px;
                    background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
                    border-bottom: 1px solid #eaf0f7;
                }

                #${offcanvasId} .cfm-panel-badge {
                    width: 46px;
                    height: 46px;
                    flex: none;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ffffff;
                    font-size: 18px;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 8px 18px rgba(2, 113, 174, 0.30);
                }

                #${offcanvasId} .cfm-panel-title {
                    margin: 0;
                    font-size: 17px;
                    font-weight: 700;
                    color: #12263f;
                    line-height: 1.25;
                }

                #${offcanvasId} .cfm-panel-sub {
                    margin-top: 2px;
                    font-size: 12.5px;
                    color: #8190a0;
                }


                /* ----- Body ----- */

                #${offcanvasId} .cfm-panel-body {
                    flex: 1 1 auto;
                    overflow-y: auto;
                    padding: 22px 24px 8px;
                }


                /* ----- Section dividers ----- */

                #${offcanvasId} .cfm-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 4px 0 16px;
                }

                #${offcanvasId} .cfm-section-title {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.09em;
                    text-transform: uppercase;
                    color: #9aa6b4;
                    white-space: nowrap;
                }

                #${offcanvasId} .cfm-section-rule {
                    flex: 1;
                    height: 1px;
                    background: linear-gradient(90deg, #e8eef5, rgba(232, 238, 245, 0));
                }


                /* ----- Fields ----- */

                #${offcanvasId} .ant-form-item { margin-bottom: 16px; }

                #${offcanvasId} .ant-form-item-label > label {
                    height: auto;
                    font-size: 12.5px;
                    font-weight: 600;
                    color: #46566a;
                }

                #${offcanvasId} .ant-input,
                #${offcanvasId} textarea.ant-input {
                    border-radius: 11px;
                    border-color: #dfe6ef;
                    background: #ffffff;
                    font-size: 14px;
                }

                #${offcanvasId} .ant-input:focus,
                #${offcanvasId} .ant-input-focused,
                #${offcanvasId} textarea.ant-input:focus {
                    border-color: #0271ae;
                    box-shadow: 0 0 0 3px rgba(2, 113, 174, 0.10);
                }


                /* ----- Footer ----- */

                #${offcanvasId} .cfm-panel-footer {
                    flex: none;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    padding: 16px 24px;
                    background: #ffffff;
                    border-top: 1px solid #eaf0f7;
                    box-shadow: 0 -8px 24px rgba(15, 33, 56, 0.05);
                }

                #${offcanvasId} .cfm-btn-ghost {
                    height: 44px;
                    padding: 0 20px;
                    border-radius: 11px;
                    font-weight: 600;
                    border-color: #dfe6ef;
                    color: #46566a;
                }

                #${offcanvasId} .cfm-btn-primary {
                    height: 44px;
                    padding: 0 22px;
                    border: none;
                    border-radius: 11px;
                    font-weight: 600;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 10px 22px rgba(2, 113, 174, 0.28);
                }

                #${offcanvasId} .cfm-btn-primary:hover { filter: brightness(1.06); }


                /* ----- Phone ----- */

                @media (max-width: 767.98px) {

                    #${offcanvasId} .cfm-panel-header { padding: 16px; }
                    #${offcanvasId} .cfm-panel-body { padding: 18px 16px 4px; }
                    #${offcanvasId} .cfm-panel-footer { padding: 14px 16px; }

                    #${offcanvasId} .cfm-panel-footer .ant-btn {
                        flex: 1;
                        justify-content: center;
                    }

                }

                #${offcanvasId} .cfm-toggle-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 14px;
                    padding: 14px 16px;
                    border: 1px solid #eaf0f7;
                    border-radius: 14px;
                    background: #ffffff;
                }

                #${offcanvasId} .cfm-toggle-row + .cfm-toggle-row {
                    margin-top: 10px;
                }

                #${offcanvasId} .cfm-toggle-text { min-width: 0; }

                #${offcanvasId} .cfm-toggle-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #12263f;
                    line-height: 1.3;
                }

                #${offcanvasId} .cfm-toggle-sub {
                    margin-top: 2px;
                    font-size: 12.5px;
                    color: #8190a0;
                }

                #${offcanvasId} .ant-switch.ant-switch-checked {
                    background: #0271ae;
                }

                /* antd v6 renamed this inner box from .ant-select-selector to
                   .ant-select-content — both are listed so the rounding holds
                   whichever version is installed. */
                #${offcanvasId} .ant-select-content,
                #${offcanvasId} .ant-select-selector {
                    border-radius: 11px !important;
                    border-color: #dfe6ef !important;
                }

            `}</style>
        </div>
    );
}