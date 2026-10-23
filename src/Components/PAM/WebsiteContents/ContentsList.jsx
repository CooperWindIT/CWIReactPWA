import React, { useState, useMemo, useEffect } from "react";
import Base1 from "../../Config/Base1";
import Swal from "sweetalert2";
import { Select } from "antd";
import {
    CONTENT_TYPES_SEED, CONTENTS_SEED, CONTENT_STATUSES, CONTENT_STYLES,
    slugify, today, fmtDate, statusMeta,
} from "../contentShared";

const EMPTY_CONTENT = {
    ContentId: 0, TypeId: undefined, Title: "", Slug: "", Summary: "", Body: "",
    CoverImage: "", Tags: [], Status: "DRAFT", PublishDate: "", Featured: 0,
};

/* ---------------- Add / Edit offcanvas ---------------- */
function ContentOffcanvas({ content, types, onClose, onSave }) {
    const show = !!content;
    const isEdit = !!content?.ContentId;
    const [form, setForm] = useState(EMPTY_CONTENT);
    const [slugTouched, setSlugTouched] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!content) return;
        setForm({ ...EMPTY_CONTENT, ...content });
        setSlugTouched(!!content.ContentId);
        setError("");
    }, [content]);

    useEffect(() => {
        if (!show) return;
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    }, [show, onClose]);

    if (!show) return null;

    const setField = (name, value) => {
        setError("");
        setForm((p) => {
            const next = { ...p, [name]: value };
            if (name === "Title" && !slugTouched) next.Slug = slugify(value);
            return next;
        });
    };

    const submit = () => {
        if (!form.TypeId) return setError("Select a content type");
        if (!form.Title.trim()) return setError("Title is required");
        if ((form.Status === "SCHEDULED" || form.Status === "PUBLISHED") && !form.PublishDate)
            return setError("Publish date is required for published / scheduled contents");
        if (form.Status === "SCHEDULED" && form.PublishDate <= today())
            return setError("Scheduled date must be in the future");
        onSave({ ...form, Title: form.Title.trim(), Slug: slugify(form.Slug || form.Title) });
    };

    // Active types only, but keep the current type selectable when editing
    const typeOptions = types
        .filter((t) => t.IsActive || t.TypeId === form.TypeId)
        .map((t) => ({
            value: t.TypeId,
            label: t.Name,
            render: <span className="d-inline-flex align-items-center gap-2"><span className="cm-dot" style={{ background: t.Color }} />{t.Name}</span>,
        }));

    return (
        <>
            <div className="cm-backdrop" onClick={onClose} />
            <div className="cm-panel" role="dialog" aria-modal="true">
                <div className="cm-panel-head d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                        <div className="cm-tile" style={{ background: "#4f7cf714", color: "#4f7cf7" }}>
                            <i className={`fa-solid ${isEdit ? "fa-pen" : "fa-file-circle-plus"}`} />
                        </div>
                        <div>
                            <h3 className="fs-5 fw-bold text-gray-900 mb-0">{isEdit ? "Edit Content" : "Add Content"}</h3>
                            <div className="fs-7 text-gray-500">{isEdit ? form.Title : "Create content under a content type"}</div>
                        </div>
                    </div>
                    <button className="cm-icon-btn" onClick={onClose} aria-label="Close"><i className="fa-solid fa-xmark" /></button>
                </div>

                <div className="cm-panel-body">
                    <div className="cm-sec">
                        <div className="cm-sec-title">Basics</div>
                        <div className="row g-4">
                            <div className="col-12">
                                <label className="cm-label req">Content Type</label>
                                <Select
                                    showSearch
                                    className="cm-ant w-100"
                                    placeholder="Select content type"
                                    optionFilterProp="label"
                                    value={form.TypeId}
                                    onChange={(v) => setField("TypeId", v)}
                                    options={typeOptions}
                                    optionRender={(o) => o.data.render}
                                    labelRender={(o) => typeOptions.find((x) => x.value === o.value)?.render || o.label}
                                    getPopupContainer={(trigger) => trigger.parentElement}
                                />
                            </div>
                            <div className="col-12">
                                <label className="cm-label req">Title</label>
                                <input className="cm-input" placeholder="e.g. 5 MW Turbine Gearbox Launch" value={form.Title} onChange={(e) => setField("Title", e.target.value)} />
                            </div>
                            <div className="col-12">
                                <label className="cm-label">Slug</label>
                                <input className="cm-input" value={form.Slug} placeholder="auto-generated" onChange={(e) => { setSlugTouched(true); setField("Slug", slugify(e.target.value)); }} />
                                <div className="cm-hint">/{types.find((t) => t.TypeId === form.TypeId)?.Slug || "type"}/{form.Slug || "slug"}</div>
                            </div>
                            <div className="col-12">
                                <label className="cm-label">Summary</label>
                                <textarea className="cm-input" rows={2} placeholder="Short description shown on listing cards" value={form.Summary} onChange={(e) => setField("Summary", e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="cm-sec">
                        <div className="cm-sec-title">Body & Media</div>
                        <div className="row g-4">
                            <div className="col-12">
                                <label className="cm-label">Body</label>
                                <textarea className="cm-input" rows={6} placeholder="Write the content here…" value={form.Body} onChange={(e) => setField("Body", e.target.value)} />
                            </div>
                            <div className="col-12">
                                <label className="cm-label">Cover image URL</label>
                                <input className="cm-input" placeholder="https://…" value={form.CoverImage} onChange={(e) => setField("CoverImage", e.target.value)} />
                            </div>
                            <div className="col-12">
                                <label className="cm-label">Tags</label>
                                <Select
                                    mode="tags"
                                    className="cm-ant w-100"
                                    placeholder="Type and press Enter"
                                    value={form.Tags}
                                    onChange={(v) => setField("Tags", v)}
                                    tokenSeparators={[","]}
                                    getPopupContainer={(trigger) => trigger.parentElement}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="cm-sec">
                        <div className="cm-sec-title">Publishing</div>
                        <div className="row g-4">
                            <div className="col-md-6">
                                <label className="cm-label">Status</label>
                                <select className="cm-input" value={form.Status} onChange={(e) => setField("Status", e.target.value)}>
                                    {CONTENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className={`cm-label ${["PUBLISHED", "SCHEDULED"].includes(form.Status) ? "req" : ""}`}>Publish date</label>
                                <input type="date" className="cm-input" value={form.PublishDate} onChange={(e) => setField("PublishDate", e.target.value)} />
                            </div>
                            <div className="col-12">
                                <label className="form-check form-switch form-check-custom form-check-solid">
                                    <input className="form-check-input cm-switch" type="checkbox" checked={!!form.Featured} onChange={(e) => setField("Featured", e.target.checked ? 1 : 0)} />
                                    <span className="form-check-label fs-7 fw-semibold text-gray-700">Feature on homepage</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {error && <div className="cm-err fs-7">{error}</div>}
                </div>

                <div className="cm-panel-foot">
                    <button className="cm-btn-light" onClick={onClose}>Cancel</button>
                    <button className="cm-btn" onClick={submit}>{isEdit ? "Update Content" : "Create Content"}</button>
                </div>
            </div>
        </>
    );
}

/* ---------------- List screen ---------------- */
export default function Contents() {
    // Static for now: types come from the Content Types seed
    const [types] = useState(CONTENT_TYPES_SEED);
    const [contents, setContents] = useState(CONTENTS_SEED);
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [editing, setEditing] = useState(null); // null | {} (add) | content (edit)

    const typeById = useMemo(() => Object.fromEntries(types.map((t) => [t.TypeId, t])), [types]);
    const activeTypes = types.filter((t) => t.IsActive);

    const countFor = (typeId) => (typeId === "ALL" ? contents.length : contents.filter((c) => c.TypeId === typeId).length);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return contents
            .filter((c) => typeFilter === "ALL" || c.TypeId === typeFilter)
            .filter((c) => statusFilter === "ALL" || c.Status === statusFilter)
            .filter((c) => !q || [c.Title, c.Summary, c.Author, ...(c.Tags || [])].some((v) => (v || "").toLowerCase().includes(q)))
            .sort((a, b) => b.UpdatedOn.localeCompare(a.UpdatedOn));
    }, [contents, typeFilter, statusFilter, search]);

    const openAdd = () => {
        if (!activeTypes.length) {
            return Swal.fire({ icon: "info", title: "No content types yet", text: "Create a content type first, then add contents under it." });
        }
        setEditing({ ...EMPTY_CONTENT, TypeId: typeFilter !== "ALL" ? typeFilter : undefined });
    };

    const handleSave = (record) => {
        if (contents.some((c) => c.ContentId !== record.ContentId && c.TypeId === record.TypeId && c.Slug === record.Slug)) {
            return Swal.fire({ icon: "warning", title: "Slug already used in this type" });
        }
        if (record.ContentId) {
            setContents((prev) => prev.map((c) => (c.ContentId === record.ContentId ? { ...c, ...record, UpdatedOn: today() } : c)));
        } else {
            const nextId = Math.max(100, ...contents.map((c) => c.ContentId)) + 1;
            setContents((prev) => [{ ...record, ContentId: nextId, Author: "You", UpdatedOn: today() }, ...prev]);
        }
        setEditing(null);
        Swal.fire({ icon: "success", title: record.ContentId ? "Content updated" : "Content created", timer: 1300, showConfirmButton: false });
    };

    const handleDelete = async (c) => {
        const { isConfirmed } = await Swal.fire({
            icon: "warning", title: "Delete content?", text: c.Title, showCancelButton: true,
            confirmButtonText: "Delete", confirmButtonColor: "#e5534b",
        });
        if (isConfirmed) setContents((prev) => prev.filter((x) => x.ContentId !== c.ContentId));
    };

    const StatusPill = ({ value }) => {
        const s = statusMeta(value);
        return <span className="cm-pill" style={{ background: `${s.color}14`, color: s.color }}><i className={`fa-solid ${s.icon}`} style={{ fontSize: 10 }} />{s.label}</span>;
    };

    const TypeTag = ({ typeId }) => {
        const t = typeById[typeId];
        return <span className="d-inline-flex align-items-center gap-2 text-nowrap"><span className="cm-dot" style={{ background: t?.Color || "#cbd2dc" }} />{t?.Name || "—"}</span>;
    };

    return (
        <Base1>
            <style>{CONTENT_STYLES}</style>

            <div className="app-content flex-column-fluid mb-10 pt-5">
                <div className="app-container container-xxl">

                    {/* Header */}
                    <div className="cm-card cm-header d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div className="d-flex align-items-center gap-4 position-relative">
                            <div className="cm-head-icon"><i className="fa-solid fa-file-lines" /></div>
                            <div>
                                <h1 className="fs-3 fw-bold text-gray-900 mb-1">Contents</h1>
                                <div className="cm-crumb">
                                    <span>Website</span><i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
                                    <span className="text-gray-700 fw-medium">Contents</span>
                                </div>
                            </div>
                        </div>
                        <button className="cm-btn position-relative" onClick={openAdd}>
                            <i className="fa-solid fa-plus me-2" />Add Content
                        </button>
                    </div>

                    {/* Type chips */}
                    <div className="d-flex flex-wrap gap-2 mt-5">
                        <button className={`cm-chip ${typeFilter === "ALL" ? "on" : ""}`} onClick={() => setTypeFilter("ALL")}>
                            All types <span className="cnt">{countFor("ALL")}</span>
                        </button>
                        {types.map((t) => (
                            <button key={t.TypeId} className={`cm-chip ${typeFilter === t.TypeId ? "on" : ""}`} onClick={() => setTypeFilter(t.TypeId)} style={{ opacity: t.IsActive ? 1 : 0.55 }} title={t.IsActive ? "" : "Inactive type"}>
                                <span className="cm-dot" style={{ background: t.Color }} />{t.Name}<span className="cnt">{countFor(t.TypeId)}</span>
                            </button>
                        ))}
                    </div>

                    {/* List */}
                    <div className="cm-card p-5 mt-4">
                        <div className="d-flex flex-wrap gap-3 justify-content-between mb-4">
                            <div className="cm-search-wrap" style={{ width: 300, maxWidth: "100%" }}>
                                <i className="fa-solid fa-magnifying-glass" />
                                <input className="cm-search" placeholder="Search title, author, tags" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                            <select className="cm-input" style={{ width: 180 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="ALL">All statuses</option>
                                {CONTENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>

                        {/* Desktop */}
                        <div className="table-responsive d-none d-md-block">
                            <table className="cm-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th style={{ minWidth: 280 }}>Title</th>
                                        <th>Type</th>
                                        <th>Author</th>
                                        <th>Status</th>
                                        <th>Publish</th>
                                        <th>Updated</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={8}>
                                            <div className="cm-empty">
                                                <i className="fa-solid fa-file-circle-question" />
                                                {contents.length ? "No contents match your filters" : "No contents yet"}
                                                {!contents.length && <div className="mt-3"><button className="cm-btn" onClick={openAdd}>Add your first content</button></div>}
                                            </div>
                                        </td></tr>
                                    ) : filtered.map((c, i) => (
                                        <tr key={c.ContentId}>
                                            <td className="text-gray-400">{i + 1}</td>
                                            <td>
                                                <div className="fw-semibold text-gray-900 d-flex align-items-center gap-2">
                                                    {c.Title}
                                                    {!!c.Featured && <i className="fa-solid fa-star" style={{ color: "#f5b301", fontSize: 11 }} title="Featured" />}
                                                </div>
                                                <div className="fs-8 text-gray-500 text-truncate" style={{ maxWidth: 380 }}>{c.Summary || `/${c.Slug}`}</div>
                                            </td>
                                            <td><TypeTag typeId={c.TypeId} /></td>
                                            <td className="text-nowrap">{c.Author}</td>
                                            <td><StatusPill value={c.Status} /></td>
                                            <td className="text-gray-500 text-nowrap">{fmtDate(c.PublishDate)}</td>
                                            <td className="text-gray-500 text-nowrap">{fmtDate(c.UpdatedOn)}</td>
                                            <td className="text-end text-nowrap">
                                                <button className="cm-icon-btn me-2" title="Edit" onClick={() => setEditing(c)}><i className="fa-solid fa-pen" /></button>
                                                <button className="cm-icon-btn danger" title="Delete" onClick={() => handleDelete(c)}><i className="fa-solid fa-trash-can" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile */}
                        <div className="d-block d-md-none">
                            {filtered.length === 0 ? (
                                <div className="cm-empty"><i className="fa-solid fa-file-circle-question" />No contents found</div>
                            ) : filtered.map((c) => (
                                <div key={c.ContentId} className="py-4" style={{ borderBottom: "1px solid #f2f3f6" }}>
                                    <div className="d-flex justify-content-between gap-2">
                                        <div className="min-w-0">
                                            <div className="fw-semibold text-gray-900">{c.Title}</div>
                                            <div className="fs-8 text-gray-500 mt-1"><TypeTag typeId={c.TypeId} /> · {c.Author}</div>
                                        </div>
                                        <StatusPill value={c.Status} />
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                        <span className="fs-8 text-gray-500">Updated {fmtDate(c.UpdatedOn)}</span>
                                        <div>
                                            <button className="cm-icon-btn me-2" onClick={() => setEditing(c)}><i className="fa-solid fa-pen" /></button>
                                            <button className="cm-icon-btn danger" onClick={() => handleDelete(c)}><i className="fa-solid fa-trash-can" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <ContentOffcanvas content={editing} types={types} onClose={() => setEditing(null)} onSave={handleSave} />
        </Base1>
    );
}