import React, { useEffect, useState } from "react";
import { Modal, Input, message } from "antd";

export default function EmployeeKPIEditModal({
    open,
    onCancel,
    onSave,
    data,
    loading
}) {

    const [formData, setFormData] = useState({
        Id: null,
        KPIName: "",
        TargetValue: "",
        Weightage: ""
    });

    useEffect(() => {

        if (!data) return;

        setFormData({
            Id: data.Id,
            KPIName: data.KPIName,
            TargetValue: data.Target,
            Weightage: data.Weightage
        });

    }, [data]);

    const handleSubmit = () => {

        if (!formData.TargetValue) {
            return message.warning("Please enter Target.");
        }

        if (!formData.Weightage) {
            return message.warning("Please enter Weightage.");
        }

        onSave(formData);

    };

    return (
        <Modal
            open={open}
            onCancel={onCancel}
            width={550}
            destroyOnClose
            title="Edit Employee KPI"
            footer={[
                <button
                    key="cancel"
                    className="btn btn-light btn-sm"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancel
                </button>,
                <button
                    key="save"
                    className="btn btn-primary btn-sm"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Updating...
                        </>
                    ) : (
                        <>
                            <i className="fa fa-save me-2"></i>
                            Update
                        </>
                    )}
                </button>
            ]}
        >

            <div className="mb-4">
                <label className="form-label fw-bold">
                    KPI Name
                </label>

                <Input
                    value={formData.KPIName}
                    disabled
                />
            </div>

            <div className="row">

                <div className="col-md-6">
                    <label className="form-label fw-bold">
                        Target
                    </label>

                    <Input
                        type="number"
                        value={formData.TargetValue}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                TargetValue: e.target.value
                            })
                        }
                    />
                </div>

                <div className="col-md-6">
                    <label className="form-label fw-bold">
                        Weightage
                    </label>

                    <Input
                        type="number"
                        value={formData.Weightage}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                Weightage: e.target.value
                            })
                        }
                    />
                </div>

            </div>

        </Modal>
    );
}