import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { saveJob, isApiSuccess } from "../services/pamServices";
import { OffcanvasShell, JobFormFields, EMPTY_JOB, jobToForm, buildJobPayload, validateJob } from "./JobForm";

export default function EditJobOffcanvas({ job, onClose, onSaved, sessionUserData, departments }) {
    const show = !!job;
    const [form, setForm] = useState(EMPTY_JOB);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (job) setForm(jobToForm(job));
    }, [job]);

    const setField = (name, value) => setForm((p) => ({ ...p, [name]: value }));

    const handleSubmit = async () => {
        const error = validateJob(form);
        if (error) return Swal.fire({ icon: "warning", title: error, timer: 2200, showConfirmButton: false });

        setSaving(true);
        try {
            const res = await saveJob({
                orgId: sessionUserData?.OrgId,
                userId: sessionUserData?.Id ?? sessionUserData?.UserId,
                job: { ...buildJobPayload(form), JobId: job.JobId },
            });
            if (!isApiSuccess(res)) throw new Error(res?.Message || "Failed to update job");

            Swal.fire({ icon: "success", title: "Job updated", timer: 1500, showConfirmButton: false });
            onSaved?.();
            onClose();
        } catch (err) {
            console.error("Edit job failed:", err);
            Swal.fire({ icon: "error", title: "Error", text: err.message });
        } finally {
            setSaving(false);
        }
    };

    return (
        <OffcanvasShell
            show={show}
            onClose={onClose}
            title="Edit Job"
            subtitle={job ? `#${job.JobId} · ${job.JobTitle}` : ""}
            icon="ki-pencil"
            footer={
                <>
                    <button className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? <><span className="spinner-border spinner-border-sm me-2" />Updating...</> : "Update Job"}
                    </button>
                </>
            }
        >
            <JobFormFields form={form} setField={setField} departments={departments} />
        </OffcanvasShell>
    );
}