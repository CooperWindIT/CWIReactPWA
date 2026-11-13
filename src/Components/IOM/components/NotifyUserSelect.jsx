import React, { useEffect, useMemo, useRef, useState } from "react";
import { getDDLUsers } from "../services/services";
import "./NotifyUserSelect.css";

/**
 * Searchable user picker for "Notify" (NotifyId).
 * Users come from ADMINRoutes/CWIGetDDLItems (DDLName "Users"), cached in sessionStorage.
 *
 * <NotifyUserSelect orgId value={userId|0} onChange={(id, user) => ...} disabled excludeId={myId} />
 */
const initialsOf = (n) => String(n || "?").split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();

const NotifyUserSelect = ({ orgId, value = 0, onChange, disabled = false, excludeId, placeholder = "Select a user to notify" }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [term, setTerm] = useState("");
    const boxRef = useRef(null);
    const searchRef = useRef(null);

    const load = async (force = false) => {
        if (!orgId) return;
        setLoading(true);
        setError("");
        try {
            setUsers(await getDDLUsers(orgId, { force }));
        } catch (e) {
            console.error("CWIGetDDLItems Error:", e);
            setError("Could not load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

    // close when clicking outside
    useEffect(() => {
        if (!open) return;
        const onDoc = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); } };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey, true);
        setTimeout(() => searchRef.current?.focus(), 30);
        return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey, true); };
    }, [open]);

    const list = useMemo(() => {
        const t = term.trim().toLowerCase();
        return users
            .filter(u => !excludeId || Number(u.Id) !== Number(excludeId))
            .filter(u => !t || [u.Name, u.Email, u.Department].some(v => String(v).toLowerCase().includes(t)));
    }, [users, term, excludeId]);

    const selected = users.find(u => Number(u.Id) === Number(value)) || null;

    const pick = (u) => {
        onChange?.(u ? u.Id : 0, u || null);
        setOpen(false);
        setTerm("");
    };

    return (
        <div className={`nu-box ${open ? "open" : ""} ${disabled ? "disabled" : ""}`} ref={boxRef}>
            <button type="button" className="nu-btn" disabled={disabled} onClick={() => setOpen(o => !o)}>
                {selected ? (
                    <>
                        <span className="nu-avatar">{initialsOf(selected.Name)}</span>
                        <span className="nu-main">
                            <b>{selected.Name}</b>
                            <small>{[selected.Email, selected.Department].filter(Boolean).join(" · ")}</small>
                        </span>
                    </>
                ) : (
                    <>
                        <span className="nu-avatar empty"><i className="fa-regular fa-bell" /></span>
                        <span className="nu-main"><span className="nu-ph">{loading ? "Loading users…" : placeholder}</span></span>
                    </>
                )}
                {selected && !disabled && (
                    <span className="nu-clear" role="button" title="Clear" onClick={(e) => { e.stopPropagation(); pick(null); }}>
                        <i className="fa-solid fa-xmark" />
                    </span>
                )}
                <i className="fa-solid fa-chevron-down nu-caret" />
            </button>

            {open && (
                <div className="nu-panel">
                    <div className="nu-search">
                        <i className="fa-solid fa-magnifying-glass" />
                        <input ref={searchRef} value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search name, email or department" />
                    </div>
                    <ul className="nu-list">
                        {loading ? (
                            <li className="nu-empty"><span className="spinner-border spinner-border-sm" /> Loading users…</li>
                        ) : error ? (
                            <li className="nu-empty">{error} · <button type="button" className="nu-link" onClick={() => load(true)}>Retry</button></li>
                        ) : !list.length ? (
                            <li className="nu-empty">No users found</li>
                        ) : list.map(u => (
                            <li key={u.Id}>
                                <button type="button" className={`nu-opt ${Number(u.Id) === Number(value) ? "active" : ""}`} onClick={() => pick(u)}>
                                    <span className="nu-avatar">{initialsOf(u.Name)}</span>
                                    <span className="nu-main">
                                        <b>{u.Name}</b>
                                        <small>{u.Email}</small>
                                    </span>
                                    {u.Department && <span className="nu-dept">{u.Department}</span>}
                                    {Number(u.Id) === Number(value) && <i className="fa-solid fa-check nu-check" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                    <div className="nu-foot">
                        <span>{list.length} user{list.length === 1 ? "" : "s"}</span>
                        <button type="button" className="nu-link" onClick={() => load(true)} disabled={loading}>
                            <i className="fa-solid fa-rotate-right" /> Refresh list
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotifyUserSelect;