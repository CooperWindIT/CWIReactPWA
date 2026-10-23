import React, { useState, useEffect, useMemo, useCallback } from "react";
import Base1 from "../../Config/Base1";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { getJobs, getDepartments, toggleJobActive, isApiSuccess } from "../services/pamServices";
import { JOB_TYPES, WORK_MODES, JOB_STATUSES, labelOf } from "./JobForm";
import AddJobOffcanvas from "./AddJobOffcanvas";
import EditJobOffcanvas from "./EditJobOffcanvas";

const AVATAR_PALETTE = ["#7c5cd6", "#4f7cf7", "#26a69a", "#f08c4a", "#e2669b", "#3bb3d6", "#8a63e8", "#3a9d6b"];
const STATUS_COLORS = { DRAFT: "#8a94a6", OPEN: "#22a06b", ON_HOLD: "#e8a33d", CLOSED: "#e5534b" };

const avatarColor = (t = "") => AVATAR_PALETTE[[...t].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_PALETTE.length];
const initials = (t = "") => t.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "J";
const inr = (n) => (n || n === 0 ? `₹${Number(n).toLocaleString("en-IN")}` : "");
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const salaryText = (j) => j.SalaryDescription || (j.SalaryMin || j.SalaryMax ? `${inr(j.SalaryMin)} - ${inr(j.SalaryMax)}` : "—");
const expText = (j) => (j.ExperienceMin != null || j.ExperienceMax != null ? `${j.ExperienceMin ?? 0}–${j.ExperienceMax ?? "+"} yrs` : "—");

export default function JobsList() {
    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState(null);
    const [navigationPath, setNavigationPath] = useState("");
    const [dataLoading, setDataLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [jobs, setJobs] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [editData, setEditData] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [departmentsData, setDepartmentsData] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
            setNavigationPath(sessionStorage.getItem("navigationPath") || "/");
        } else {
            navigate("/");
        }
    }, [navigate]);

    const fetchJobs = useCallback(async () => {
        if (!sessionUserData?.OrgId) return;
        setDataLoading(true);
        try {
            const data = await getJobs(sessionUserData.OrgId, 0);
            setJobs(data?.ResultData || []);
        } catch (error) {
            console.error("Failed to fetch jobs:", error);
            setJobs([]);
        } finally {
            setDataLoading(false);
        }
    }, [sessionUserData?.OrgId]);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    useEffect(() => {
        if (!sessionUserData?.OrgId) return;
        getDepartments(sessionUserData.OrgId)
            .then(setDepartmentsData)
            .catch((error) => {
                console.error("Failed to fetch departments:", error);
                setDepartmentsData([]);
            });
    }, [sessionUserData?.OrgId]);

    // antd options: { value: ItemId, label: name }
    const departments = useMemo(
        () => departmentsData.map((d) => ({ value: Number(d.ItemId), label: d.ItemName ?? d.ItemValue ?? d.DisplayValue ?? `Dept #${d.ItemId}` })),
        [departmentsData]
    );
    const deptName = useCallback(
        (j) => j.DepartmentName || j.DeptName || departments.find((d) => String(d.value) === String(j.DepartmentId))?.label || (j.DepartmentId ? `Dept #${j.DepartmentId}` : "—"),
        [departments]
    );

    const handleToggleActive = async (job) => {
        const activate = !Number(job.IsActive);
        const { isConfirmed } = await Swal.fire({
            title: `${activate ? "Activate" : "Deactivate"} job?`,
            text: job.JobTitle,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: activate ? "Activate" : "Deactivate",
            confirmButtonColor: activate ? "#22a06b" : "#e5534b",
        });
        if (!isConfirmed) return;

        setTogglingId(job.JobId);
        try {
            const res = await toggleJobActive({
                orgId: sessionUserData.OrgId,
                userId: sessionUserData.Id ?? sessionUserData.UserId,
                jobId: job.JobId,
                isActive: activate,
            });
            if (!isApiSuccess(res)) throw new Error(res?.Message || "Failed to update status");
            setJobs((prev) => prev.map((j) => (j.JobId === job.JobId ? { ...j, IsActive: activate ? 1 : 0 } : j)));
            Swal.fire({ icon: "success", title: `Job ${activate ? "activated" : "deactivated"}`, timer: 1300, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: "error", title: "Error", text: err.message });
        } finally {
            setTogglingId(null);
        }
    };

    const filteredJobs = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return jobs.filter((j) => {
            if (statusFilter !== "ALL" && j.Status !== statusFilter) return false;
            if (!q) return true;
            return [j.JobTitle, j.Location, j.Skills, deptName(j)].some((v) => String(v || "").toLowerCase().includes(q));
        });
    }, [jobs, searchQuery, statusFilter, deptName]);

    const stats = useMemo(() => [
        { label: "Total Jobs", value: jobs.length, icon: "ki-briefcase", color: "#4f7cf7" },
        { label: "Open", value: jobs.filter((j) => j.Status === "OPEN").length, icon: "ki-rocket", color: "#22a06b" },
        { label: "Drafts", value: jobs.filter((j) => j.Status === "DRAFT").length, icon: "ki-notepad-edit", color: "#e8a33d" },
        { label: "Total Openings", value: jobs.reduce((a, j) => a + (Number(j.OpeningsCount) || 0), 0), icon: "ki-people", color: "#8a63e8" },
    ], [jobs]);

    /* ---------- small pieces ---------- */
    const JobAvatar = ({ job }) => {
        const c = avatarColor(job.JobTitle);
        return <div className="jl-avatar" style={{ background: `${c}1a`, color: c }}>{initials(job.JobTitle)}</div>;
    };

    const StatusPill = ({ status }) => {
        const c = STATUS_COLORS[status] || "#8a94a6";
        return (
            <span className="jl-pill" style={{ background: `${c}14`, color: c }}>
                <span className="jl-dot" style={{ background: c }} />
                {labelOf(JOB_STATUSES, status)}
            </span>
        );
    };

    const ActiveSwitch = ({ job }) =>
        togglingId === job.JobId ? (
            <span className="spinner-border spinner-border-sm text-primary" />
        ) : (
            <div className="form-check form-switch form-check-custom form-check-solid">
                <input className="form-check-input jl-switch" type="checkbox" checked={!!Number(job.IsActive)} onChange={() => handleToggleActive(job)} />
            </div>
        );

    const EditBtn = ({ job }) => (
        <button className="jl-icon-btn" title="Edit" onClick={() => setEditData(job)}>
            <i className="ki-duotone ki-pencil fs-4"><span className="path1"></span><span className="path2"></span></i>
        </button>
    );

    const EmptyState = () => (
        <div className="text-center py-15">
            <div className="jl-empty-icon mx-auto mb-4">
                <i className="ki-duotone ki-briefcase fs-2x"><span className="path1"></span><span className="path2"></span></i>
            </div>
            <div className="fs-6 fw-semibold text-gray-800">{jobs.length ? "No jobs match your filters" : "No jobs posted yet"}</div>
            <div className="fs-7 text-gray-500 mt-1">{jobs.length ? "Try a different search or status" : "Create your first opening to get started"}</div>
            {!jobs.length && <button className="btn btn-sm btn-primary jl-btn mt-5" onClick={() => setShowAdd(true)}>Post a job</button>}
        </div>
    );

    return (
        <Base1>
            <style>{`
                .jl-card{background:#fff;border:1px solid #eef0f4;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
                .jl-header{position:relative;overflow:hidden;padding:20px 24px;background:linear-gradient(120deg,#ffffff 55%,#f1f5ff 100%)}
                .jl-header::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(79,124,247,.12),transparent 70%);pointer-events:none}
                .jl-head-icon{width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,#4f7cf7,#2f5be0);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(79,124,247,.3)}
                .jl-crumb{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#8a94a6}
                .jl-crumb a{color:#8a94a6}
                .jl-crumb a:hover{color:#4f7cf7}
                .jl-stat{padding:18px 20px;transition:box-shadow .2s,transform .2s}
                .jl-stat:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(16,24,40,.06)}
                .jl-stat-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center}
                .jl-avatar{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex-shrink:0}
                .jl-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;white-space:nowrap}
                .jl-dot{width:6px;height:6px;border-radius:50%}
                .jl-seg{background:#f4f5f8;border-radius:10px;padding:3px;display:inline-flex;gap:2px;flex-wrap:wrap}
                .jl-seg button{border:0;background:transparent;padding:6px 14px;border-radius:8px;font-size:13px;color:#6b7280;font-weight:500;transition:all .15s}
                .jl-seg button.active{background:#fff;color:#1f2937;box-shadow:0 1px 3px rgba(16,24,40,.08)}
                .jl-search{background:#f7f8fa;border:1px solid transparent;border-radius:10px;transition:all .15s}
                .jl-search:focus{background:#fff;border-color:#d6defa;box-shadow:0 0 0 4px rgba(79,124,247,.08)}
                .jl-table thead th{background:#fafbfc;color:#8a94a6;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:12px 14px;border:0}
                .jl-table thead th:first-child{border-radius:10px 0 0 10px}
                .jl-table thead th:last-child{border-radius:0 10px 10px 0}
                .jl-table tbody td{padding:14px;border-bottom:1px solid #f2f3f6;color:#4b5563;font-size:13.5px}
                .jl-table tbody tr:last-child td{border-bottom:0}
                .jl-table tbody tr{transition:background .15s}
                .jl-table tbody tr:hover{background:#fafbff}
                .jl-icon-btn{width:38px;height:38px;border-radius:10px;border:1px solid #eef0f4;background:#fff;color:#6b7280;display:inline-flex;align-items:center;justify-content:center;transition:all .15s}
                .jl-icon-btn:hover{color:#4f7cf7;border-color:#d6defa;background:#f5f8ff}
                .jl-btn{border-radius:10px;background:linear-gradient(135deg,#4f7cf7,#2f5be0)!important;border:0;box-shadow:0 6px 16px rgba(79,124,247,.3)}
                .jl-switch{width:34px!important;height:19px!important}
                .jl-switch:checked{background-color:#22a06b!important;border-color:#22a06b!important}
                .jl-empty-icon{width:64px;height:64px;border-radius:18px;background:#f4f5f8;color:#a0a8b8;display:flex;align-items:center;justify-content:center}
                .jl-tag{background:#f4f5f8;color:#6b7280;border-radius:6px;padding:3px 8px;font-size:12px}
            `}</style>

            <div id="kt_app_content" className="app-content flex-column-fluid mb-10 pt-5">
                <div id="kt_app_content_container" className="app-container container-xxl">

                    {/* Premium header */}
                    <div className="jl-card jl-header d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div className="d-flex align-items-center gap-4 position-relative">
                            <div className="jl-head-icon">
                                <i className="ki-duotone ki-briefcase fs-1 text-white"><span className="path1"></span><span className="path2"></span></i>
                            </div>
                            <div>
                                <h1 className="fs-3 fw-bold text-gray-900 mb-1">Career Jobs</h1>
                                <div className="jl-crumb">
                                    <a href={navigationPath}>Home</a>
                                    <i className="ki-duotone ki-right fs-8"></i>
                                    <span className="text-gray-700 fw-medium">Jobs</span>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex align-items-center gap-2 position-relative">
                            <button className="jl-icon-btn" title="Refresh" onClick={fetchJobs} disabled={dataLoading}>
                                {dataLoading
                                    ? <span className="spinner-border spinner-border-sm" />
                                    : <i className="ki-duotone ki-arrows-circle fs-3"><span className="path1"></span><span className="path2"></span></i>}
                            </button>
                            <button className="btn btn-primary jl-btn px-5 py-3" onClick={() => setShowAdd(true)}>
                                <i className="ki-duotone ki-plus fs-3"></i>Add Job
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="row g-4 mt-1">
                        {stats.map((s) => (
                            <div className="col-6 col-lg-3" key={s.label}>
                                <div className="jl-card jl-stat d-flex align-items-center justify-content-between h-100">
                                    <div>
                                        <div className="fs-7 text-gray-500 fw-medium">{s.label}</div>
                                        <div className="fs-2 fw-bold text-gray-900 mt-1">{s.value}</div>
                                    </div>
                                    <div className="jl-stat-icon" style={{ background: `${s.color}14`, color: s.color }}>
                                        <i className={`ki-duotone ${s.icon} fs-2`} style={{ color: s.color }}>
                                            <span className="path1"></span><span className="path2"></span><span className="path3"></span>
                                        </i>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* List */}
                    <div className="jl-card mt-5">
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-5 pb-4">
                            <div className="position-relative">
                                <i className="ki-duotone ki-magnifier fs-4 position-absolute top-50 translate-middle-y ms-4 text-gray-500">
                                    <span className="path1"></span><span className="path2"></span>
                                </i>
                                <input
                                    type="text"
                                    className="form-control jl-search w-250px ps-12 fs-7"
                                    placeholder="Search title, location, skills"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="jl-seg">
                                {[{ value: "ALL", label: "All" }, ...JOB_STATUSES].map((s) => (
                                    <button key={s.value} className={statusFilter === s.value ? "active" : ""} onClick={() => setStatusFilter(s.value)}>
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Desktop table */}
                        <div className="px-5 pb-5 d-none d-md-block">
                            <div className="table-responsive">
                                <table className="table align-middle mb-0 jl-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th className="min-w-225px">Job</th>
                                            <th className="min-w-110px">Type</th>
                                            <th>Experience</th>
                                            <th className="min-w-110px">Salary</th>
                                            <th className="text-center">Openings</th>
                                            <th>Status</th>
                                            <th className="min-w-100px">Closing</th>
                                            <th>Active</th>
                                            <th className="text-end"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dataLoading ? (
                                            <tr><td colSpan={10} className="text-center py-10"><span className="spinner-border spinner-border-sm text-primary" /></td></tr>
                                        ) : filteredJobs.length === 0 ? (
                                            <tr><td colSpan={10}><EmptyState /></td></tr>
                                        ) : (
                                            filteredJobs.map((job, i) => (
                                                <tr key={job.JobId}>
                                                    <td className="text-gray-400">{i + 1}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-3">
                                                            <JobAvatar job={job} />
                                                            <div>
                                                                <div className="text-gray-900 fw-semibold">{job.JobTitle}</div>
                                                                <div className="fs-8 text-gray-500 mt-1">{deptName(job)} · {job.Location || "—"}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="text-gray-800">{labelOf(JOB_TYPES, job.JobType)}</div>
                                                        <div className="fs-8 text-gray-500 mt-1">{labelOf(WORK_MODES, job.WorkMode)}</div>
                                                    </td>
                                                    <td>{expText(job)}</td>
                                                    <td className="text-gray-800 fw-medium">{salaryText(job)}</td>
                                                    <td className="text-center text-gray-800">{job.OpeningsCount ?? 0}</td>
                                                    <td><StatusPill status={job.Status} /></td>
                                                    <td className="text-gray-500">{fmtDate(job.ClosingDate)}</td>
                                                    <td><ActiveSwitch job={job} /></td>
                                                    <td className="text-end"><EditBtn job={job} /></td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Mobile cards */}
                        <div className="px-4 pb-4 d-block d-md-none">
                            {dataLoading ? (
                                <div className="text-center py-10"><span className="spinner-border spinner-border-sm text-primary" /></div>
                            ) : filteredJobs.length === 0 ? (
                                <EmptyState />
                            ) : (
                                filteredJobs.map((job) => (
                                    <div key={job.JobId} className="jl-card p-4 mb-3">
                                        <div className="d-flex justify-content-between align-items-start gap-2">
                                            <div className="d-flex gap-3">
                                                <JobAvatar job={job} />
                                                <div>
                                                    <div className="fw-semibold text-gray-900">{job.JobTitle}</div>
                                                    <div className="fs-8 text-gray-500 mt-1">{deptName(job)} · {job.Location || "—"}</div>
                                                </div>
                                            </div>
                                            <StatusPill status={job.Status} />
                                        </div>
                                        <div className="d-flex flex-wrap gap-2 my-3">
                                            <span className="jl-tag">{labelOf(JOB_TYPES, job.JobType)}</span>
                                            <span className="jl-tag">{labelOf(WORK_MODES, job.WorkMode)}</span>
                                            <span className="jl-tag">{expText(job)}</span>
                                            <span className="jl-tag">{job.OpeningsCount ?? 0} openings</span>
                                        </div>
                                        <div className="d-flex justify-content-between align-items-center pt-3" style={{ borderTop: "1px solid #f2f3f6" }}>
                                            <div>
                                                <div className="fw-semibold text-gray-800 fs-7">{salaryText(job)}</div>
                                                <div className="fs-8 text-gray-500">Closes {fmtDate(job.ClosingDate)}</div>
                                            </div>
                                            <div className="d-flex align-items-center gap-3">
                                                <ActiveSwitch job={job} />
                                                <EditBtn job={job} />
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AddJobOffcanvas show={showAdd} onClose={() => setShowAdd(false)} onSaved={fetchJobs} sessionUserData={sessionUserData} departments={departments} />
            <EditJobOffcanvas job={editData} onClose={() => setEditData(null)} onSaved={fetchJobs} sessionUserData={sessionUserData} departments={departments} />
        </Base1>
    );
}