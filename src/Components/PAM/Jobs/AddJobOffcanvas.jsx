import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { saveJob, isApiSuccess } from "../services/pamServices";
import { OffcanvasShell, JobFormFields, EMPTY_JOB, buildJobPayload, validateJob } from "./JobForm";

export default function AddJobOffcanvas({ show, onClose, onSaved, sessionUserData, departments }) {
    const [form, setForm] = useState(EMPTY_JOB);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (show) setForm({ ...EMPTY_JOB, DepartmentId: sessionUserData?.DeptId || "" });
    }, [show, sessionUserData]);

    const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

    const handleSubmit = async () => {
        const error = validateJob(form);
        if (error) return Swal.fire({ icon: "warning", title: error, timer: 2200, showConfirmButton: false });

        setSaving(true);
        try {
            const res = await saveJob({
                orgId: sessionUserData?.OrgId,
                userId: sessionUserData?.Id ?? sessionUserData?.UserId,
                job: { ...buildJobPayload(form), JobId: 0 },
            });
            if (!isApiSuccess(res)) throw new Error(res?.Message || "Failed to create job");

            Swal.fire({ icon: "success", title: "Job created", timer: 1500, showConfirmButton: false });
            onSaved?.();
            onClose();
        } catch (err) {
            console.error("Add job failed:", err);
            Swal.fire({ icon: "error", title: "Error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OffcanvasShell
            show={show}
            onClose={onClose}
            title="Post a New Job"
            subtitle="Create a job opening for your organization"
            icon="ki-add-files"
            footer={
                <>
                    <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</> : "Create Job"}
                    </button>
                </>
            }
        >
            <JobFormFields form={form} setField={setField} departments={departments} />
        </OffcanvasShell>
    );
}