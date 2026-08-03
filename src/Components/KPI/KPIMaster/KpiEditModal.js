import React, { useEffect, useState } from "react";
import { Modal, Input, Select, message } from "antd";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const { TextArea } = Input;

export default function KpiEditModal({
    open,
    onCancel,
    onSave,
    kpiData,
    title,
    activeTab,
    uomTypes,
    managerKpis
}) {

    const [sessionUserData, setSessionUserData] = useState({});
    const [editorReady, setEditorReady] = useState(false);

    const [formData, setFormData] = useState({
        Id: null,
        KPIName: "",
        Objectives: "",
        Measurables: "",
        UOM: null,
        ParentId: null,
        DeptId: null
    });

    useEffect(() => {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
        if (userData) {
            setSessionUserData(userData);
        }
    }, []);

    useEffect(() => {
        if (!open || !kpiData) return;

        setEditorReady(false);

        setFormData({
            Id: kpiData.Id,
            KPIName: kpiData.KPIName || "",
            Objectives: kpiData.Objectives || "",
            Measurables: kpiData.Measurables || "",
            UOM: kpiData.UOMId || null,
            ParentId: kpiData.ParentId || null,
            DeptId: kpiData.DeptId || sessionUserData?.DeptId
        });

        // Mount ReactQuill after modal/form initialization
        const timer = setTimeout(() => {
            setEditorReady(true);
        }, 100);

        return () => clearTimeout(timer);

    }, [open, kpiData]);

    const handleSubmit = () => {
        if (!formData.KPIName.trim()) {
            message.warning("Please enter KPI Name.");
            return;
        }
        if (!formData.UOM) {
            message.warning("Please select Unit Of Measure.");
            return;
        }
        if (
            activeTab === "department" &&
            !formData.ParentId
        ) {
            message.warning("Please select Parent KPI.");
            return;
        }
        if (!formData.Objectives.trim()) {
            message.warning("Please enter Objective.");
            return;
        }
        if (!formData.Measurables.trim()) {
            message.warning("Please enter Measurables.");
            return;
        }
        onSave(formData);
    };

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            width={850}
            destroyOnClose
            title={
                <div className="d-flex justify-content-between align-items-center pe-4">
                    <div className="d-flex align-items-center">
                        <div
                            className="rounded-circle bg-light-warning d-flex align-items-center justify-content-center me-3"
                            style={{
                                width: 50,
                                height: 50
                            }}
                        >
                            <i className="fa fa-edit text-warning fs-3"></i>
                        </div>
                        <div>
                            <h4 className="fw-bold mb-0">
                                {title || "Edit KPI"}
                            </h4>
                            <span className="text-muted fs-7">
                                Update KPI information
                            </span>
                        </div>
                    </div>
                    <div className="badge badge-light-warning px-4 py-2">
                        EDIT MODE
                    </div>
                </div>
            }
            footer={[
                <button
                    key="cancel"
                    className="btn btn-light btn-sm me-2"
                    onClick={onCancel}
                >
                    Cancel
                </button>,
                <button
                    key="save"
                    className="btn btn-warning btn-sm"
                    onClick={handleSubmit}
                >
                    <i className="fa fa-save me-2"></i>
                    Update KPI
                </button>
            ]}
        >

            <hr className="text-warning" />

            <div className="row g-4">
                {activeTab === "department" && (
                    <div className="col-md-6">
                        <label className="form-label">
                            Parent KPI
                            <span className="text-danger">*</span>
                        </label>
                        <Select
                            style={{ width: "100%" }}
                            placeholder="Select Parent KPI"
                            value={formData.ParentId}
                            onChange={(value) =>
                                setFormData({
                                    ...formData,
                                    ParentId: value
                                })
                            }
                            options={
                                Array.isArray(managerKpis)
                                  ? managerKpis.map((item) => ({
                                      value: item.Id || item.ParentId,
                                      label: item.KPIName,
                                    }))
                                  : []
                              }
                            disabled={activeTab === "department"}
                        />
                    </div>
                )}
                <div className="col-md-6">
                    <label className="form-label">
                        Unit Of Measure
                        <span className="text-danger">*</span>
                    </label>
                    <Select
                        style={{ width: "100%" }}
                        placeholder="Select UOM"
                        value={formData.UOM}
                        onChange={(value) =>
                            setFormData({
                                ...formData,
                                UOM: value
                            })
                        }
                        options={uomTypes.map(item => ({
                            value: item.Id,
                            label: item.TypeName
                        }))}
                        disabled={activeTab === "department"}
                    />
                </div>

                <div className="col-md-6">
                    <label className="form-label">
                        KPI Name
                        <span className="text-danger">*</span>
                    </label>
                    <Input
                        status={!formData.KPIName.trim() ? "error" : ""}
                        value={formData.KPIName}
                        placeholder="Enter KPI Name"
                        onChange={(e) => {
                            const value = e.target.value;

                            const formattedValue =
                                value.charAt(0).toUpperCase() + value.slice(1);

                            setFormData({
                                ...formData,
                                KPIName: formattedValue
                            });
                        }}
                    />
                </div>
                <div className="col-md-6">
                    <label className="form-label">
                        Measurables
                        <span className="text-danger">*</span>
                    </label>
                    <Input
                        status={!formData.Measurables.trim() ? "error" : ""}
                        value={formData.Measurables}
                        placeholder="Enter Measurables"
                        onChange={(e) => {
                            const value = e.target.value;

                            setFormData({
                                ...formData,
                                Measurables: value
                            });
                        }}
                    />
                </div>

                <div className="col-12">
                    <label className="form-label">
                        Objectives
                        <span className="text-danger">*</span>
                    </label>

                    {editorReady && (
                        <ReactQuill
                            key={kpiData?.Id}
                            theme="snow"
                            value={formData.Objectives || ""}
                            onChange={(value) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    Objectives: value
                                }))
                            }
                            placeholder="Enter KPI objectives..."
                            className="objective-quill"
                        />
                    )}
                </div>
            </div>

            <style>
                {`
                   .objective-quill .ql-container {
                        height: 100px;
                    }

                    .objective-quill .ql-editor {
                        height: 100%;
                        overflow-y: auto;
                    }

                    .objective-quill .ql-container {
                        height: auto;
                    }

                    .quill-error .ql-container {
                        border-color: #ff4d4f !important;
                    }

                    .quill-error .ql-toolbar {
                        border-color: #ff4d4f !important;
                    }
                `}
            </style>
        </Modal>
    );
}