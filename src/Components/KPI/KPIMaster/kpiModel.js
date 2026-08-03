import React, { useState, useEffect } from "react";
import { Modal, Input, Select, Collapse, message } from "antd";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const { TextArea } = Input;

export default function KpiModal({
    open,
    onCancel,
    onSave,
    title,
    activeTab,
    uomTypes,
    loading,
    selectedParentId,
    selectedParentUOMId,
}) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [activeKeys, setActiveKeys] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        } else {
            console.log("/");
        }
    }, []);

    const [kpis, setKpis] = useState([
        {
            id: Date.now(),
            KPIName: "",
            Measurables: "",
            objective: "",
            targetValue: "",
            uom: selectedParentUOMId || null,
            deptId: sessionUserData?.DeptId,
            parentId: activeTab === "department" ? selectedParentId : null,
        }
    ]);

    useEffect(() => {
        if (kpis.length > 0 && activeKeys.length === 0) {
            setActiveKeys([kpis[0].id.toString()]);
        }
    }, []);

    useEffect(() => {
        if (open) {
            setKpis([
                {
                    id: Date.now(),
                    KPIName: "",
                    Measurables: "",
                    objective: "",
                    targetValue: "",
                    uom: selectedParentUOMId || null,
                    deptId: sessionUserData?.DeptId,
                    parentId: activeTab === "department" ? selectedParentId : null,
                }
            ]);

            setActiveKeys([Date.now().toString()]);
        }
    }, [open, sessionUserData]);

    const addKPI = () => {

        const newId = Date.now().toString();

        setKpis(prev => [
            ...prev,
            {
                id: newId,
                KPIName: "",
                Measurables: "",
                objective: "",
                targetValue: "",
                uom: selectedParentUOMId || null,
                deptId: sessionUserData?.DeptId,
                parentId: activeTab === "department" ? selectedParentId : null,
            }
        ]);

        // Close previous panels and open only new panel
        setActiveKeys([newId]);
    };

    const removeKPI = (id) => {
        const updated = kpis.filter(x => x.id !== id);
        setKpis(updated);

        if (updated.length > 0) {
            setActiveKeys([updated[updated.length - 1].id.toString()]);
        }

    };

    const updateKPI = (id, field, value) => {
        setKpis(prev =>
            prev.map(item =>
                item.id === id
                    ? { ...item, [field]: value }
                    : item
            )
        );
    };

    const getInitialKPI = () => ({
        id: Date.now(),
        KPIName: "",
        Measurables: "",
        objective: "",
        targetValue: "",
        uom: selectedParentUOMId || null,
        deptId: sessionUserData?.DeptId,
        parentId: activeTab === "department" ? selectedParentId : null,
    });
    
    const handleSave = async () => {
        for (let i = 0; i < kpis.length; i++) {
            const item = kpis[i];
    
            if (activeTab === "department" && !item.parentId) {
                setActiveKeys([item.id.toString()]);
                return message.warning(`Please select Parent KPI for KPI #${i + 1}.`);
            }
    
            if (!item.KPIName?.trim()) {
                setActiveKeys([item.id.toString()]);
                return message.warning(`Please enter KPI Name for KPI #${i + 1}.`);
            }
    
            if (!item.Measurables?.trim()) {
                setActiveKeys([item.id.toString()]);
                return message.warning(`Please enter Measurables for KPI #${i + 1}.`);
            }
    
            if (!item.uom) {
                setActiveKeys([item.id.toString()]);
                return message.warning(`Please select Unit Of Measure for KPI #${i + 1}.`);
            }
    
            if (!item.objective?.trim()) {
                setActiveKeys([item.id.toString()]);
                return message.warning(`Please enter Objective for KPI #${i + 1}.`);
            }
        }
    
        const success = await onSave(kpis);
    
        if (success) {
            setKpis([getInitialKPI()]);
            setActiveKeys([Date.now().toString()]);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            width={900}
            title={
                <div className="d-flex justify-content-between align-items-center pe-4">
                    <div className="d-flex align-items-center">
                        <div
                            className="rounded-circle bg-light-primary d-flex align-items-center justify-content-center me-3"
                            style={{
                                width: "50px",
                                height: "50px"
                            }}
                        >
                            <i className="fa fa-bullseye text-primary fs-3"></i>
                        </div>
                        <div>
                            <h4 className="fw-bold mb-0">
                                {title}
                            </h4>
                            <span className="text-muted fs-7">
                                Configure KPI objectives
                            </span>
                        </div>
                    </div>
                    <div className="badge badge-light-primary px-4 py-2">
                        {kpis.length} KPI{kpis.length > 1 ? "'s" : ""}
                    </div>
                </div>
            }
            footer={[
                <button
                    key="cancel"
                    className="btn btn-light btn-sm me-2"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancel
                </button>,
                <button
                    key="save"
                    className="btn btn-primary btn-sm"
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Saving...
                        </>
                    ) : (
                        <>
                            <i className="fa fa-save me-2"></i>
                            Save KPI
                        </>
                    )}
                </button>
            ]}
        >
            <hr className="text-primary" />

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h6 className="fw-bold mb-1">
                        KPI Configuration
                    </h6>
                </div>
                <button
                    className="btn btn-primary btn-sm shadow-sm"
                    onClick={addKPI}
                >
                    <i className="fa fa-plus me-2"></i>
                    Add KPI
                </button>
            </div>
            <div
                style={{
                    maxHeight: "340px",
                    overflowY: "auto",
                    paddingRight: "5px"
                }}
            >
                <Collapse
                    activeKey={activeKeys}
                    onChange={(keys) =>
                        setActiveKeys(Array.isArray(keys) ? keys : [keys])
                    }
                >
                    {kpis.map((item, index) => (
                        <Collapse.Panel
                            key={item.id}
                            header={
                                <div className="d-flex justify-content-between align-items-center w-100">
                                    <span className="fw-bold">
                                        KPI #{index + 1}
                                    </span>
                                    {kpis.length > 1 && (
                                        <button
                                            type="button"
                                            className="btn btn-light-danger btn-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeKPI(item.id);
                                            }}
                                        >
                                            <i className="fa fa-trash me-1"></i>
                                            Remove
                                        </button>
                                    )}
                                </div>
                            }
                        >
                            <div className="row g-4">
                                <div className="col-8">
                                    <label className="form-label">KPI Name<span className="text-danger">*</span></label>
                                    <Input
                                        value={item.KPIName}
                                        onChange={(e) => {
                                            const value = e.target.value;

                                            const formattedValue =
                                                value.charAt(0).toUpperCase() + value.slice(1);

                                            updateKPI(
                                                item.id,
                                                "KPIName",
                                                formattedValue
                                            );
                                        }}
                                        placeholder="Enter KPI Name"
                                    />
                                </div>
                                <div className="col-4">
                                    <label className="form-label">Measurables<span className="text-danger">*</span></label>
                                    <Input
                                        value={item.Measurables}
                                        onChange={(e) => {
                                            const value = e.target.value;

                                            updateKPI(
                                                item.id,
                                                "Measurables",
                                                value
                                            );
                                        }}
                                        placeholder="Enter Measurables"
                                    />
                                </div>
                                {activeTab === "organization" && (
                                    <div className="col-12 col-md-4">
                                        <label className="form-label">Unit Of Measure<span className="text-danger">*</span></label>
                                        <Select
                                            style={{ width: "100%" }}
                                            placeholder="Select UOM"
                                            value={item.uom}
                                            onChange={(value) =>
                                                updateKPI(
                                                    item.id,
                                                    "uom",
                                                    value
                                                )
                                            }
                                            options={uomTypes.map(uom => ({
                                                value: uom.Id,
                                                label: uom.TypeName
                                            }))}
                                        />
                                    </div>
                                )}

                                <div className="col-md-12">
                                    <label className="form-label">
                                        Objectives <span className="text-danger">*</span>
                                    </label>

                                    <ReactQuill
                                        theme="snow"
                                        value={item.objective || ""}
                                        onChange={(value) =>
                                            updateKPI(item.id, "objective", value)
                                        }
                                        placeholder="Enter objectives..."
                                        className="objective-quill"
                                    />
                                </div>
                            </div>

                        </Collapse.Panel>
                    ))}
                </Collapse>
            </div>

            <style>
                {`
                    .objective-quill .ql-editor {
                        min-height: 95px;
                        max-height: 95px;
                        overflow-y: auto;
                    }

                    .objective-quill .ql-container {
                        height: 95px;
                    }
                `}
            </style>
        </Modal>
    );
}