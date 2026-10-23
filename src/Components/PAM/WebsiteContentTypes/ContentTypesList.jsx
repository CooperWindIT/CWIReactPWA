import React, { useState, useMemo } from "react";
import Base1 from "../../Config/Base1";
import Swal from "sweetalert2";
import {
    CONTENT_TYPES_SEED, CONTENTS_SEED, TYPE_COLORS, CONTENT_STYLES,
    slugify, today, fmtDate, initials,
} from "../contentShared";

const EMPTY_FORM = { TypeId: 0, Name: "", Slug: "", Description: "", Color: TYPE_COLORS[0], IsActive: 1 };

export default function ContentTypes() {
    const [types, setTypes] = useState(CONTENT_TYPES_SEED);
    const [search, setSearch] = useState("");
    const [form, setForm] = useState(EMPTY_FORM);
    const [slugTouched, setSlugTouched] = useState(false);
    const [error, setError] = useState("");

    const isEdit = form.TypeId > 0;

    // contents per type (static)
    const countByType = useMemo(() => {
        const map = {};
        CONTENTS_SEED.forEach((c) => { map[c.TypeId] = (map[c.TypeId] || 0) + 1; });
        return map;
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? types.filter((t) => [t.Name, t.Slug, t.Description].some((v) => (v || "").toLowerCase().includes(q))) : types;
    }, [types, search]);

    const setField = (name, value) => {
        setError("");
        setForm((p) => {
            const next = { ...p, [name]: value };
            if (name === "Name" && !slugTouched) next.Slug = slugify(value);
            return next;
        });
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM, Color: TYPE_COLORS[types.length % TYPE_COLORS.length] });
        setSlugTouched(false);
        setError("");
    };

    const handleEdit = (t) => {
        setForm({ ...t });
        setSlugTouched(true);
        setError("");
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const name = form.Name.trim();
        const slug = slugify(form.Slug || name);
        if (!name) return setError("Name is required");
        if (types.some((t) => t.TypeId !== form.TypeId && t.Name.toLowerCase() === name.toLowerCase()))
            return setError("A content type with this name already exists");
        if (types.some((t) => t.TypeId !== form.TypeId && t.Slug === slug))
            return setError("This slug is already in use");

        const record = { ...form, Name: name, Slug: slug, Description: form.Description.trim() };

        if (isEdit) {
            setTypes((prev) => prev.map((t) => (t.TypeId === form.TypeId ? { ...t, ...record } : t)));
        } else {
            const nextId = Math.max(0, ...types.map((t) => t.TypeId)) + 1;
            setTypes((prev) => [{ ...record, TypeId: nextId, CreatedOn: today() }, ...prev]);
        }
        Swal.fire({ icon: "success", title: isEdit ? "Content type updated" : "Content type created", timer: 1300, showConfirmButton: false });
        resetForm();
    };

    const handleToggle = (t) =>
        setTypes((prev) => prev.map((x) => (x.TypeId === t.TypeId ? { ...x, IsActive: x.IsActive ? 0 : 1 } : x)));

    const handleDelete = async (t) => {
        if (countByType[t.TypeId]) {
            return Swal.fire({
                icon: "info",
                title: "Can't delete this type",
                text: `${countByType[t.TypeId]} content(s) use "${t.Name}". Deactivate it instead, or move those contents first.`,
            });
        }
        const { isConfirmed } = await Swal.fire({
            icon: "warning", title: `Delete "${t.Name}"?`, showCancelButton: true,
            confirmButtonText: "Delete", confirmButtonColor: "#e5534b",
        });
        if (!isConfirmed) return;
        setTypes((prev) => prev.filter((x) => x.TypeId !== t.TypeId));
        if (form.TypeId === t.TypeId) resetForm();
    };

    return (
        <Base1>
            <style>{CONTENT_STYLES}</style>

            <div className="app-content flex-column-fluid mb-10 pt-5">
                <div className="app-container container-xxl">

                    {/* Header */}
                    <div className="cm-card cm-header d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div className="d-flex align-items-center gap-4 position-relative">
                            <div className="cm-head-icon"><i className="fa-solid fa-layer-group" /></div>
                            <div>
                                <h1 className="fs-3 fw-bold text-gray-900 mb-1">Content Types</h1>
                                <div className="cm-crumb">
                                    <span>Website</span><i className="fa-solid fa-chevron-right" style={{ fontSize: 9 }} />
                                    <span className="text-gray-700 fw-medium">Content Types</span>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex gap-2 position-relative">
                            <span className="cm-pill" style={{ background: "#eef2ff", color: "#4f46e5" }}>{types.length} types</span>
                            <span className="cm-pill" style={{ background: "#e7f8ef", color: "#059669" }}>{types.filter((t) => t.IsActive).length} active</span>
                        </div>
                    </div>

                    <div className="row g-5 mt-0">
                        {/* List */}
                        <div className="col-lg-7">
                            <div className="cm-card p-5">
                                <div className="cm-search-wrap mb-4">
                                    <i className="fa-solid fa-magnifying-glass" />
                                    <input className="cm-search" placeholder="Search content types" value={search} onChange={(e) => setSearch(e.target.value)} />
                                </div>

                                <div className="table-responsive">
                                    <table className="cm-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Name</th>
                                                <th className="text-center">Contents</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.length === 0 ? (
                                                <tr><td colSpan={5}><div className="cm-empty"><i className="fa-solid fa-layer-group" />No content types found</div></td></tr>
                                            ) : filtered.map((t, i) => (
                                                <tr key={t.TypeId} className={form.TypeId === t.TypeId ? "editing" : ""}>
                                                    <td className="text-gray-400">{i + 1}</td>
                                                    <td>
                                                        <div className="d-flex align-items-center gap-3">
                                                            <div className="cm-tile" style={{ background: `${t.Color}1a`, color: t.Color }}>{initials(t.Name)}</div>
                                                            <div className="min-w-0">
                                                                <div className="fw-semibold text-gray-900">{t.Name}</div>
                                                                <div className="fs-8 text-gray-500">/{t.Slug} · {fmtDate(t.CreatedOn)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="text-center fw-semibold text-gray-800">{countByType[t.TypeId] || 0}</td>
                                                    <td>
                                                        <div className="form-check form-switch form-check-custom form-check-solid">
                                                            <input className="form-check-input cm-switch" type="checkbox" checked={!!t.IsActive} onChange={() => handleToggle(t)} title={t.IsActive ? "Active" : "Inactive"} />
                                                        </div>
                                                    </td>
                                                    <td className="text-end text-nowrap">
                                                        <button className="cm-icon-btn me-2" title="Edit" onClick={() => handleEdit(t)}><i className="fa-solid fa-pen" /></button>
                                                        <button className="cm-icon-btn danger" title="Delete" onClick={() => handleDelete(t)}><i className="fa-solid fa-trash-can" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="col-lg-5">
                            <form className="cm-card p-6 cm-sticky" onSubmit={handleSubmit}>
                                <div className="d-flex align-items-center justify-content-between mb-5">
                                    <div>
                                        <h3 className="fs-5 fw-bold text-gray-900 mb-1">{isEdit ? "Edit Content Type" : "Add Content Type"}</h3>
                                        <div className="fs-7 text-gray-500">{isEdit ? `Editing "${types.find((t) => t.TypeId === form.TypeId)?.Name}"` : "Create a type, then add contents under it"}</div>
                                    </div>
                                    {isEdit && <button type="button" className="cm-icon-btn" title="Cancel edit" onClick={resetForm}><i className="fa-solid fa-xmark" /></button>}
                                </div>

                                <div className="mb-4">
                                    <label className="cm-label req">Name</label>
                                    <input className="cm-input" placeholder="e.g. Webinars" value={form.Name} onChange={(e) => setField("Name", e.target.value)} autoFocus />
                                </div>

                                <div className="mb-4">
                                    <label className="cm-label">Slug</label>
                                    <input
                                        className="cm-input"
                                        placeholder="auto-generated"
                                        value={form.Slug}
                                        onChange={(e) => { setSlugTouched(true); setField("Slug", slugify(e.target.value)); }}
                                    />
                                    <div className="cm-hint">Used in website URLs: /{form.Slug || "slug"}</div>
                                </div>

                                <div className="mb-4">
                                    <label className="cm-label">Description</label>
                                    <textarea className="cm-input" rows={3} placeholder="What goes under this type?" value={form.Description} onChange={(e) => setField("Description", e.target.value)} />
                                </div>

                                <div className="mb-4">
                                    <label className="cm-label">Colour tag</label>
                                    <div className="d-flex gap-2">
                                        {TYPE_COLORS.map((c) => (
                                            <span key={c} className={`cm-swatch ${form.Color === c ? "on" : ""}`} style={{ background: c }} onClick={() => setField("Color", c)} title={c} />
                                        ))}
                                    </div>
                                </div>

                                <label className="form-check form-switch form-check-custom form-check-solid mb-2">
                                    <input className="form-check-input cm-switch" type="checkbox" checked={!!form.IsActive} onChange={(e) => setField("IsActive", e.target.checked ? 1 : 0)} />
                                    <span className="form-check-label fs-7 fw-semibold text-gray-700">Active (available when creating contents)</span>
                                </label>

                                {error && <div className="cm-err">{error}</div>}

                                <div className="d-flex justify-content-end gap-2 mt-6">
                                    <button type="button" className="cm-btn-light" onClick={resetForm}>Clear</button>
                                    <button type="submit" className="cm-btn">{isEdit ? "Update" : "Submit"}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </Base1>
    );
}