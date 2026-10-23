import React, { useEffect } from "react";
import { Select } from "antd";

/* ---------------- Constants (adjust ids to match your DB) ---------------- */
export const JOB_TYPES = [
    { value: 1, label: "Full-time" },
    { value: 2, label: "Part-time" },
    { value: 3, label: "Contract" },
    { value: 4, label: "Internship" },
];
export const WORK_MODES = [
    { value: 1, label: "On-site" },
    { value: 2, label: "Hybrid" },
    { value: 3, label: "Remote" },
];
export const JOB_STATUSES = [
    { value: "DRAFT", label: "Draft", badge: "secondary" },
    { value: "OPEN", label: "Open", badge: "success" },
    { value: "ON_HOLD", label: "On Hold", badge: "warning" },
    { value: "CLOSED", label: "Closed", badge: "danger" },
];
export const labelOf = (list, v) => list.find((x) => String(x.value) === String(v))?.label || "—";

export const EMPTY_JOB = {
    JobId: 0, JobTitle: "", DepartmentId: "", JobType: 1, WorkMode: 1, Location: "",
    ExperienceMin: "", ExperienceMax: "", JobDescription: "", Responsibilities: "",
    Qualifications: "", Requirements: "", Skills: "", SalaryMin: "", SalaryMax: "",
    SalaryDescription: "", OpeningsCount: 1, PostedDate: "", ClosingDate: "",
    Status: "DRAFT", IsActive: 1,
};

/* ---------------- Helpers ---------------- */
const toNum = (v) => (v === "" || v === null || v === undefined ? null : Number(v));
const toDateInput = (v) => (v ? String(v).slice(0, 10) : "");

export const jobToForm = (job = {}) => {
    const form = { ...EMPTY_JOB };
    Object.keys(EMPTY_JOB).forEach((k) => {
        if (job[k] !== undefined && job[k] !== null) form[k] = job[k];
    });
    form.PostedDate = toDateInput(job.PostedDate);
    form.ClosingDate = toDateInput(job.ClosingDate);
    form.IsActive = job.IsActive === undefined ? 1 : Number(job.IsActive) ? 1 : 0;
    return form;
};

export const buildJobPayload = (f) => ({
    JobId: Number(f.JobId) || 0,
    JobTitle: f.JobTitle.trim(),
    DepartmentId: toNum(f.DepartmentId),
    JobType: toNum(f.JobType),
    WorkMode: toNum(f.WorkMode),
    Location: f.Location.trim(),
    ExperienceMin: toNum(f.ExperienceMin),
    ExperienceMax: toNum(f.ExperienceMax),
    JobDescription: f.JobDescription.trim(),
    Responsibilities: f.Responsibilities.trim(),
    Qualifications: f.Qualifications.trim(),
    Requirements: f.Requirements.trim(),
    Skills: f.Skills.split(",").map((s) => s.trim()).filter(Boolean).join(", "),
    SalaryMin: toNum(f.SalaryMin),
    SalaryMax: toNum(f.SalaryMax),
    SalaryDescription: f.SalaryDescription.trim(),
    OpeningsCount: toNum(f.OpeningsCount),
    PostedDate: f.PostedDate || null,
    ClosingDate: f.ClosingDate || null,
    Status: f.Status,
    IsActive: f.IsActive ? 1 : 0,
});

export const validateJob = (f) => {
    if (!f.JobTitle.trim()) return "Job title is required";
    if (!f.DepartmentId) return "Department is required";
    if (!f.Location.trim()) return "Location is required";
    if (!(Number(f.OpeningsCount) >= 1)) return "Openings must be at least 1";
    if (f.ExperienceMin !== "" && f.ExperienceMax !== "" && Number(f.ExperienceMin) > Number(f.ExperienceMax))
        return "Min experience cannot exceed max experience";
    if (f.SalaryMin !== "" && f.SalaryMax !== "" && Number(f.SalaryMin) > Number(f.SalaryMax))
        return "Min salary cannot exceed max salary";
    if (f.PostedDate && f.ClosingDate && f.ClosingDate < f.PostedDate)
        return "Closing date cannot be before posted date";
    if (!f.JobDescription.trim()) return "Job description is required";
    return "";
};

/* ---------------- Offcanvas shell ---------------- */
export function OffcanvasShell({ show, onClose, title, subtitle, icon = "ki-briefcase", children, footer }) {
    useEffect(() => {
        if (!show) return;
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [show, onClose]);

    if (!show) return null;

    return (
        <>
            <style>{`
                .jf-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(2px);z-index:1055;animation:jfFade .2s}
                .jf-panel{position:fixed;top:0;right:0;height:100vh;width:min(680px,100vw);background:var(--bs-body-bg,#fff);z-index:1056;display:flex;flex-direction:column;box-shadow:-12px 0 40px rgba(15,23,42,.18);animation:jfSlide .25s ease-out}
                .jf-head{padding:18px 24px;border-bottom:1px solid #f0f1f5}
                .jf-body{flex:1;overflow-y:auto;padding:20px 24px}
                .jf-foot{padding:14px 24px;border-top:1px solid #f0f1f5}
                .jf-foot .btn{border-radius:10px}
                .jf-sec{background:#fafbfc;border:1px solid #f0f1f5;border-radius:14px;padding:18px;margin-bottom:14px}
                .jf-sec .form-control,.jf-sec .form-select{background:#fff;border:1px solid #e9ecf2;border-radius:10px}
                .jf-sec .form-control:focus,.jf-sec .form-select:focus{border-color:#c9d6fb;box-shadow:0 0 0 4px rgba(79,124,247,.08)}
                .jf-select .ant-select-selector{border-radius:10px!important;border-color:#e9ecf2!important;min-height:43px;align-items:center}
                .jf-select.ant-select-focused .ant-select-selector{border-color:#c9d6fb!important;box-shadow:0 0 0 4px rgba(79,124,247,.08)!important}
                .jf-sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8a94a6;margin-bottom:12px}
                @keyframes jfSlide{from{transform:translateX(100%)}to{transform:none}}
                @keyframes jfFade{from{opacity:0}to{opacity:1}}
            `}</style>
            <div className="jf-backdrop" onClick={onClose} />
            <div className="jf-panel" role="dialog" aria-modal="true">
                <div className="jf-head d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="symbol symbol-40px">
                            <span className="symbol-label" style={{ background: "#4f7cf714", borderRadius: 12 }}>
                                <i className={`ki-duotone ${icon} fs-2`} style={{ color: "#4f7cf7" }}><span className="path1"></span><span className="path2"></span></i>
                            </span>
                        </div>
                        <div>
                            <h3 className="text-gray-900 fw-semibold fs-4 mb-0">{title}</h3>
                            {subtitle && <div className="text-gray-500 fs-7 mt-1">{subtitle}</div>}
                        </div>
                    </div>
                    <button type="button" className="btn btn-sm btn-icon btn-light" style={{ borderRadius: 10 }} onClick={onClose} aria-label="Close">
                        <i className="ki-duotone ki-cross fs-2 text-gray-600"><span className="path1"></span><span className="path2"></span></i>
                    </button>
                </div>
                <div className="jf-body">{children}</div>
                {footer && <div className="jf-foot d-flex justify-content-end gap-2">{footer}</div>}
            </div>
        </>
    );
}

/* ---------------- Form fields ---------------- */
const Section = ({ title, children }) => (
    <div className="jf-sec">
        <div className="jf-sec-title">{title}</div>
        <div className="row g-4">{children}</div>
    </div>
);

const Field = ({ label, required, col = "col-md-6", children }) => (
    <div className={col}>
        <label className={`form-label fs-7 fw-semibold mb-1 ${required ? "required" : ""}`}>{label}</label>
        {children}
    </div>
);

export function JobFormFields({ form, setField, departments = [] }) {
    const input = (name, props = {}) => (
        <input
            className="form-control form-control-solid"
            value={form[name] ?? ""}
            onChange={(e) => setField(name, e.target.value)}
            {...props}
        />
    );
    const textarea = (name, placeholder, rows = 3) => (
        <textarea
            className="form-control form-control-solid"
            rows={rows}
            placeholder={placeholder}
            value={form[name] ?? ""}
            onChange={(e) => setField(name, e.target.value)}
        />
    );
    const select = (name, options) => (
        <select className="form-select form-select-solid" value={form[name] ?? ""} onChange={(e) => setField(name, e.target.value)}>
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
    );
    const skills = (form.Skills || "").split(",").map((s) => s.trim()).filter(Boolean);

    return (
        <>
            <Section title="Basic Information">
                <Field label="Job Title" required col="col-12">
                    {input("JobTitle", { placeholder: "e.g. Node.js Backend Developer", autoFocus: true })}
                </Field>
                <Field label="Department" required>
                    <Select
                        showSearch
                        allowClear
                        size="large"
                        className="jf-select w-100"
                        placeholder="Search department"
                        optionFilterProp="label"
                        options={departments}
                        loading={!departments.length}
                        notFoundContent="No departments found"
                        value={form.DepartmentId === "" || form.DepartmentId == null ? undefined : Number(form.DepartmentId)}
                        onChange={(v) => setField("DepartmentId", v ?? "")}
                        getPopupContainer={(trigger) => trigger.parentElement}
                    />
                </Field>
                <Field label="Location" required>{input("Location", { placeholder: "e.g. Hyderabad" })}</Field>
                <Field label="Job Type">{select("JobType", JOB_TYPES)}</Field>
                <Field label="Work Mode">{select("WorkMode", WORK_MODES)}</Field>
            </Section>

            <Section title="Experience, Openings & Salary">
                <Field label="Min Exp (yrs)" col="col-md-4">{input("ExperienceMin", { type: "number", min: 0 })}</Field>
                <Field label="Max Exp (yrs)" col="col-md-4">{input("ExperienceMax", { type: "number", min: 0 })}</Field>
                <Field label="Openings" required col="col-md-4">{input("OpeningsCount", { type: "number", min: 1 })}</Field>
                <Field label="Min Salary (₹ / yr)" col="col-md-4">{input("SalaryMin", { type: "number", min: 0, placeholder: "500000" })}</Field>
                <Field label="Max Salary (₹ / yr)" col="col-md-4">{input("SalaryMax", { type: "number", min: 0, placeholder: "800000" })}</Field>
                <Field label="Salary Label" col="col-md-4">{input("SalaryDescription", { placeholder: "5 - 8 LPA" })}</Field>
            </Section>

            <Section title="Job Details">
                <Field label="Job Description" required col="col-12">{textarea("JobDescription", "What is this role about?", 4)}</Field>
                <Field label="Responsibilities" col="col-12">{textarea("Responsibilities", "Key responsibilities")}</Field>
                <Field label="Qualifications" col="col-md-6">{textarea("Qualifications", "B.Tech / B.E ...")}</Field>
                <Field label="Requirements" col="col-md-6">{textarea("Requirements", "Must-have experience")}</Field>
                <Field label="Skills (comma separated)" col="col-12">
                    {input("Skills", { placeholder: "Node.js, Express.js, MSSQL" })}
                    {skills.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mt-2">
                            {skills.map((s) => <span key={s} className="badge badge-light-primary fw-semibold">{s}</span>)}
                        </div>
                    )}
                </Field>
            </Section>

            <Section title="Publishing">
                <Field label="Posted Date" col="col-md-4">{input("PostedDate", { type: "date" })}</Field>
                <Field label="Closing Date" col="col-md-4">{input("ClosingDate", { type: "date", min: form.PostedDate || undefined })}</Field>
                <Field label="Status" col="col-md-4">{select("Status", JOB_STATUSES)}</Field>
                <div className="col-12">
                    <label className="form-check form-switch form-check-custom form-check-solid">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            checked={!!Number(form.IsActive)}
                            onChange={(e) => setField("IsActive", e.target.checked ? 1 : 0)}
                        />
                        <span className="form-check-label fw-semibold text-gray-700">Active</span>
                    </label>
                </div>
            </Section>
        </>
    );
}