
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Form, Input, Button, Upload, Tooltip, message } from "antd";
import { saveCustomer, readResult } from "../Services/cfmServices";
import { BASE_IMAGE_API_GET } from "../../Config/Config";

const { TextArea } = Input;

const MAX_LOGO_MB = 2;

export default function RegisterCustomer({
    offcanvasId = "offcanvasRightAddCustomer",
    customer = null,
    orgId,
    userId,
    onSaved,
}) {
    const [form] = Form.useForm();

    const offcanvasRef = useRef(null);

    const [submitting, setSubmitting] = useState(false);

    // The newly chosen file, if any. Null means "leave the stored logo alone".
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState("");

    const isEdit = Boolean(customer?.Id);

    // The logo already on the record, used both for the preview and as
    // OldImageUrl when it is being replaced.
    const storedLogo = customer?.LogoImgURL || "";

    const storedLogoSrc = useMemo(
        () => (storedLogo ? `${BASE_IMAGE_API_GET}${storedLogo}` : ""),
        [storedLogo]
    );

    // -------------------------------------------------------------
    // FILL THE FORM WHEN THE PANEL OPENS
    //
    // Bound to the open event rather than to the `customer` prop alone: the
    // panel is mounted once and reused, so without this, opening Add straight
    // after an Edit would show the previous customer's details.
    // -------------------------------------------------------------

    useEffect(() => {
        const el = offcanvasRef.current;
        if (!el) return undefined;

        const fill = () => {
            clearLogoSelection();

            form.setFieldsValue({
                CustomerName: customer?.CustomerName || "",
                ContactPerson: customer?.ContactPerson || "",
                Email: customer?.Email || "",
                MobileNumber: customer?.MobileNumber || "",
                Address: customer?.Address || "",
            });
        };

        el.addEventListener("show.bs.offcanvas", fill);
        return () => el.removeEventListener("show.bs.offcanvas", fill);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer]);

    // Also fill on prop change, for the case where the list opens the panel
    // programmatically in the same tick as it sets the row.
    useEffect(() => {
        clearLogoSelection();

        form.setFieldsValue({
            CustomerName: customer?.CustomerName || "",
            ContactPerson: customer?.ContactPerson || "",
            Email: customer?.Email || "",
            MobileNumber: customer?.MobileNumber || "",
            Address: customer?.Address || "",
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer]);

    // Object URLs are not garbage collected on their own.
    useEffect(() => {
        return () => {
            if (logoPreview) URL.revokeObjectURL(logoPreview);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [logoPreview]);

    const clearLogoSelection = () => {
        setLogoFile(null);
        setLogoPreview((previous) => {
            if (previous) URL.revokeObjectURL(previous);
            return "";
        });
    };

    // -------------------------------------------------------------
    // LOGO
    // -------------------------------------------------------------

    const handleBeforeUpload = (file) => {
        const isImage = file.type?.startsWith("image/");

        if (!isImage) {
            message.error("Please choose an image file.");
            return Upload.LIST_IGNORE;
        }

        if (file.size / 1024 / 1024 > MAX_LOGO_MB) {
            message.error(`The logo must be under ${MAX_LOGO_MB}MB.`);
            return Upload.LIST_IGNORE;
        }

        if (logoPreview) URL.revokeObjectURL(logoPreview);

        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));

        // Returning false keeps antd from uploading it itself — the file goes
        // up with the rest of the form.
        return false;
    };

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

        // Bootstrap not on window (imported as a module): trigger its own
        // delegated dismiss handler instead.
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
            // Field errors are already shown inline.
            return;
        }

        const payload = {
            Id: customer?.Id || 0,
            CustomerName: values.CustomerName.trim(),
            ContactPerson: values.ContactPerson.trim(),
            Email: values.Email.trim(),
            MobileNumber: String(values.MobileNumber).trim(),
            Address: values.Address.trim(),
        };

        try {
            setSubmitting(true);

            const response = await saveCustomer({
                orgId,
                userId,
                customer: payload,
                imageFile: logoFile,
                // Only sent when a new file is replacing an existing one.
                oldImageUrl: logoFile ? storedLogo : "",
            });

            const result = readResult(response);

            if (result.ok) {
                message.success(
                    result.message ||
                        (isEdit ? "Customer updated." : "Customer registered.")
                );

                clearLogoSelection();
                form.resetFields();
                closePanel();

                if (typeof onSaved === "function") onSaved();
            } else {
                message.error(result.message || "Could not save the customer.");
            }
        } catch (error) {
            console.error("SaveCustomer failed:", error);
            message.error("Something went wrong while saving.");
        } finally {
            setSubmitting(false);
        }
    };

    const previewSrc = logoPreview || storedLogoSrc;

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
                                isEdit ? "bi-pencil-square" : "bi-person-plus-fill"
                            }`}
                        ></i>
                    </span>

                    <div className="ms-3">
                        <h5 id={`${offcanvasId}Label`} className="cfm-panel-title">
                            {isEdit ? "Edit Customer" : "Register Customer"}
                        </h5>

                        <div className="cfm-panel-sub">
                            {isEdit
                                ? customer?.CustomerName
                                : "Add a new customer to your organisation"}
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

                    {/* ---- Logo ---- */}

                    <div className="cfm-section">
                        <span className="cfm-section-title">Logo</span>
                        <span className="cfm-section-rule" />
                    </div>

                    <div className="cfm-logo-row">
                        <div className="cfm-logo-frame">
                            {previewSrc ? (
                                <img src={previewSrc} alt="Customer logo" />
                            ) : (
                                <span className="cfm-logo-empty">
                                    <i className="bi bi-image"></i>
                                </span>
                            )}
                        </div>

                        <div className="cfm-logo-actions">
                            <Upload
                                accept="image/*"
                                maxCount={1}
                                showUploadList={false}
                                beforeUpload={handleBeforeUpload}
                            >
                                <Button className="cfm-btn-soft">
                                    <i className="bi bi-upload me-2"></i>
                                    {previewSrc ? "Change logo" : "Upload logo"}
                                </Button>
                            </Upload>

                            {logoFile && (
                                <Tooltip title="Keep the current logo">
                                    <Button
                                        type="text"
                                        danger
                                        onClick={clearLogoSelection}
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </Button>
                                </Tooltip>
                            )}

                            <div className="cfm-logo-hint">
                                PNG or JPG, up to {MAX_LOGO_MB}MB.
                                {isEdit && !logoFile && storedLogo
                                    ? " Leave it as it is to keep the current logo."
                                    : ""}
                            </div>
                        </div>
                    </div>

                    {/* ---- Customer ---- */}

                    <div className="cfm-section">
                        <span className="cfm-section-title">Customer</span>
                        <span className="cfm-section-rule" />
                    </div>

                    <div className="row g-3">
                        <div className="col-12 col-md-6">
                            <Form.Item
                                label="Customer Name"
                                name="CustomerName"
                                rules={[
                                    {
                                        required: true,
                                        message: "Customer name is required.",
                                    },
                                ]}
                            >
                                <Input
                                    prefix={<i className="bi bi-building" />}
                                    placeholder="e.g. ABC Industries"
                                />
                            </Form.Item>
                        </div>

                        <div className="col-12 col-md-6">
                            <Form.Item
                                label="Contact Person"
                                name="ContactPerson"
                                rules={[
                                    {
                                        required: true,
                                        message: "Contact person is required.",
                                    },
                                ]}
                            >
                                <Input
                                    prefix={<i className="bi bi-person" />}
                                    placeholder="e.g. Ramesh"
                                />
                            </Form.Item>
                        </div>

                        <div className="col-12 col-md-6">
                            <Form.Item
                                label="Email"
                                name="Email"
                                rules={[
                                    { required: true, message: "Email is required." },
                                    {
                                        type: "email",
                                        message: "Enter a valid email address.",
                                    },
                                ]}
                            >
                                <Input
                                    prefix={<i className="bi bi-envelope" />}
                                    placeholder="e.g. ramesh@abc.com"
                                />
                            </Form.Item>
                        </div>

                        <div className="col-12 col-md-6">
                            <Form.Item
                                label="Mobile Number"
                                name="MobileNumber"
                                rules={[
                                    {
                                        required: true,
                                        message: "Mobile number is required.",
                                    },
                                    {
                                        pattern: /^[6-9]\d{9}$/,
                                        message:
                                            "Enter a 10-digit Indian mobile number.",
                                    },
                                ]}
                            >
                                <Input
                                    prefix={<i className="bi bi-telephone" />}
                                    maxLength={10}
                                    placeholder="e.g. 9876543210"
                                    onKeyPress={(e) => {
                                        // Digits only, so the pattern rule is
                                        // about format rather than typos.
                                        if (!/[0-9]/.test(e.key)) e.preventDefault();
                                    }}
                                />
                            </Form.Item>
                        </div>

                        <div className="col-12">
                            <Form.Item
                                label="Address"
                                name="Address"
                                rules={[
                                    { required: true, message: "Address is required." },
                                ]}
                            >
                                <TextArea
                                    rows={3}
                                    maxLength={250}
                                    showCount
                                    placeholder="e.g. Hyderabad"
                                />
                            </Form.Item>
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
                    {isEdit ? "Update Customer" : "Save Customer"}
                </Button>
            </div>

            {/* ---------------- STYLES ---------------- */}

            <style>{`

                /* Desktop: a comfortable panel rather than a full-width sheet */
                @media (min-width: 768px) {
                    #${offcanvasId} { width: 46% !important; }
                }

                @media (min-width: 1600px) {
                    #${offcanvasId} { width: 38% !important; }
                }

                .cfm-offcanvas {
                    display: flex;
                    flex-direction: column;
                    background: #fbfcfe;
                }


                /* ----- Header ----- */

                .cfm-panel-header {
                    flex: none;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    padding: 20px 24px;
                    background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
                    border-bottom: 1px solid #eaf0f7;
                }

                .cfm-panel-badge {
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

                .cfm-panel-title {
                    margin: 0;
                    font-size: 17px;
                    font-weight: 700;
                    color: #12263f;
                    line-height: 1.25;
                }

                .cfm-panel-sub {
                    margin-top: 2px;
                    font-size: 12.5px;
                    color: #8190a0;
                }


                /* ----- Body ----- */

                .cfm-panel-body {
                    flex: 1 1 auto;
                    overflow-y: auto;
                    padding: 22px 24px 8px;
                }


                /* ----- Section dividers ----- */

                .cfm-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 4px 0 16px;
                }

                .cfm-section-title {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.09em;
                    text-transform: uppercase;
                    color: #9aa6b4;
                    white-space: nowrap;
                }

                .cfm-section-rule {
                    flex: 1;
                    height: 1px;
                    background: linear-gradient(90deg, #e8eef5, rgba(232, 238, 245, 0));
                }


                /* ----- Logo ----- */

                .cfm-logo-row {
                    display: flex;
                    align-items: center;
                    gap: 18px;
                    padding: 16px;
                    margin-bottom: 22px;
                    border: 1px dashed #d8e3ef;
                    border-radius: 16px;
                    background: #ffffff;
                }

                .cfm-logo-frame {
                    width: 92px;
                    height: 92px;
                    flex: none;
                    border-radius: 16px;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f4f8fc;
                    border: 1px solid #e8eef5;
                }

                .cfm-logo-frame img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }

                .cfm-logo-empty {
                    font-size: 26px;
                    color: #b9cbe0;
                }

                .cfm-logo-actions {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 8px;
                    min-width: 0;
                }

                .cfm-logo-hint {
                    width: 100%;
                    font-size: 12px;
                    color: #8190a0;
                }


                /* ----- Fields ----- */

                .cfm-offcanvas .ant-form-item { margin-bottom: 16px; }

                .cfm-offcanvas .ant-form-item-label > label {
                    height: auto;
                    font-size: 12.5px;
                    font-weight: 600;
                    color: #46566a;
                }

                .cfm-offcanvas .ant-input,
                .cfm-offcanvas .ant-input-affix-wrapper,
                .cfm-offcanvas textarea.ant-input {
                    border-radius: 11px;
                    border-color: #dfe6ef;
                    background: #ffffff;
                    font-size: 14px;
                }

                .cfm-offcanvas .ant-input-affix-wrapper .anticon,
                .cfm-offcanvas .ant-input-affix-wrapper .bi {
                    color: #9aa6b4;
                }

                .cfm-offcanvas .ant-input:hover,
                .cfm-offcanvas .ant-input-affix-wrapper:hover,
                .cfm-offcanvas textarea.ant-input:hover {
                    border-color: #b9cbe0;
                }

                .cfm-offcanvas .ant-input:focus,
                .cfm-offcanvas .ant-input-focused,
                .cfm-offcanvas .ant-input-affix-wrapper-focused,
                .cfm-offcanvas textarea.ant-input:focus {
                    border-color: #0271ae;
                    box-shadow: 0 0 0 3px rgba(2, 113, 174, 0.10);
                }


                /* ----- Footer ----- */

                .cfm-panel-footer {
                    flex: none;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    padding: 16px 24px;
                    background: #ffffff;
                    border-top: 1px solid #eaf0f7;
                    box-shadow: 0 -8px 24px rgba(15, 33, 56, 0.05);
                }

                .cfm-offcanvas .cfm-btn-ghost {
                    height: 44px;
                    padding: 0 20px;
                    border-radius: 11px;
                    font-weight: 600;
                    border-color: #dfe6ef;
                    color: #46566a;
                }

                .cfm-offcanvas .cfm-btn-primary {
                    height: 44px;
                    padding: 0 22px;
                    border: none;
                    border-radius: 11px;
                    font-weight: 600;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 10px 22px rgba(2, 113, 174, 0.28);
                }

                .cfm-offcanvas .cfm-btn-primary:hover { filter: brightness(1.06); }

                .cfm-offcanvas .cfm-btn-soft {
                    height: 40px;
                    border-radius: 10px;
                    font-weight: 600;
                    color: #0271ae;
                    border-color: #cfe3f2;
                    background: #f2f9ff;
                }


                /* ----- Phone ----- */

                @media (max-width: 767.98px) {

                    .cfm-panel-header { padding: 16px 16px; }
                    .cfm-panel-body { padding: 18px 16px 4px; }
                    .cfm-panel-footer { padding: 14px 16px; }

                    .cfm-panel-footer .ant-btn { flex: 1; justify-content: center; }

                    .cfm-logo-row { gap: 14px; padding: 14px; }

                    .cfm-logo-frame { width: 72px; height: 72px; border-radius: 14px; }

                }

            `}</style>
        </div>
    );
}