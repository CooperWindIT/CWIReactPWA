import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Base1 from '../../Config/Base1';
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../utils/api";

// =============================================================
// STATIC SAMPLE DATA (replace with APIs later)
// =============================================================

const KPIS = [
    { key: 'users', label: 'Total Users', value: 248, delta: '+12', note: 'this month', icon: 'fa-users', hero: true },
    { key: 'contents', label: 'Published Contents', value: 1326, delta: '+86', note: 'this month', icon: 'fa-file-lines', tone: 'indigo' },
    { key: 'customers', label: 'Customers', value: 412, delta: '+18', note: 'this month', icon: 'fa-handshake', tone: 'green' },
    { key: 'jobs', label: 'Open Jobs', value: 14, delta: '+3', note: 'this week', icon: 'fa-briefcase', tone: 'amber' },
];

const MONTHLY_CONTENT = [
    { m: 'Nov', v: 72 }, { m: 'Dec', v: 64 }, { m: 'Jan', v: 88 }, { m: 'Feb', v: 95 },
    { m: 'Mar', v: 110 }, { m: 'Apr', v: 102 }, { m: 'May', v: 124 }, { m: 'Jun', v: 118 },
    { m: 'Jul', v: 131 }, { m: 'Aug', v: 127 }, { m: 'Sep', v: 142 }, { m: 'Oct', v: 86 },
];

// Validated categorical order (fixed – never cycled)
const CONTENT_TYPES = [
    { name: 'Blogs', count: 412, color: '#4f46e5' },
    { name: 'Products', count: 286, color: '#0ea5e9' },
    { name: 'News', count: 238, color: '#d97706' },
    { name: 'Case Studies', count: 164, color: '#10b981' },
    { name: 'Events', count: 128, color: '#db2777' },
    { name: 'Banners', count: 98, color: '#7c3aed' },
];

const STATUS = {
    Published: { color: '#047857', bg: '#e9f8ef', icon: 'fa-circle-check' },
    Draft: { color: '#475569', bg: '#f1f5f9', icon: 'fa-pen' },
    Scheduled: { color: '#1d4ed8', bg: '#e8f1ff', icon: 'fa-clock' },
    'In Review': { color: '#b45309', bg: '#fff7e0', icon: 'fa-eye' },
};

const RECENT_CONTENTS = [
    { id: 1, title: '5 MW Turbine Gearbox Launch', type: 'Products', author: 'Pitchaipandi G', status: 'Published', updated: '2026-10-13' },
    { id: 2, title: 'Cooper Wind at Windergy India 2026', type: 'Events', author: 'Reshma Q', status: 'Scheduled', updated: '2026-10-12' },
    { id: 3, title: 'How We Cut Nacelle Downtime by 32%', type: 'Case Studies', author: 'RajKumar M', status: 'In Review', updated: '2026-10-11' },
    { id: 4, title: 'Monsoon Maintenance Checklist', type: 'Blogs', author: 'Ravinath Q', status: 'Published', updated: '2026-10-10' },
    { id: 5, title: 'Q3 Production Milestone Crossed', type: 'News', author: 'Soundariya', status: 'Draft', updated: '2026-10-09' },
    { id: 6, title: 'Diwali Homepage Banner', type: 'Banners', author: 'Reshma Q', status: 'Scheduled', updated: '2026-10-08' },
];

const ACTIVITY = [
    { icon: 'fa-file-circle-plus', tone: 'indigo', text: <><b>Pitchaipandi G</b> published “5 MW Turbine Gearbox Launch”</>, time: '10 min ago' },
    { icon: 'fa-user-plus', tone: 'green', text: <><b>New customer</b> Coastal Windtech onboarded</>, time: '1 hr ago' },
    { icon: 'fa-briefcase', tone: 'amber', text: <><b>Production Engineer</b> job moved to Open</>, time: '3 hrs ago' },
    { icon: 'fa-tags', tone: 'pink', text: <><b>Reshma Q</b> added content type “Webinars”</>, time: 'Yesterday' },
    { icon: 'fa-user-shield', tone: 'blue', text: <><b>RajKumar M</b> role changed to Content Editor</>, time: 'Yesterday' },
    { icon: 'fa-file-arrow-up', tone: 'indigo', text: <><b>18 contents</b> bulk-scheduled for November</>, time: '2 days ago' },
];

const USERS_BY_ROLE = [
    { name: 'Viewer', count: 163 },
    { name: 'Sales', count: 42 },
    { name: 'Content Editor', count: 28 },
    { name: 'HR', count: 9 },
    { name: 'Admin', count: 6 },
];

const CUSTOMERS_BY_INDUSTRY = [
    { name: 'Wind Energy', count: 132 },
    { name: 'Manufacturing', count: 98 },
    { name: 'Infrastructure', count: 74 },
    { name: 'Power & Utilities', count: 61 },
    { name: 'Marine', count: 47 },
];

const HIRING_FUNNEL = [
    { name: 'Applied', count: 186 },
    { name: 'Shortlisted', count: 64 },
    { name: 'Interviewed', count: 28 },
    { name: 'Offered', count: 9 },
    { name: 'Hired', count: 6 },
];

// ---- Helpers ----
const fmt = (n) => Number(n).toLocaleString('en-IN');
const initialsOf = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const AVATAR_TONES = [
    'linear-gradient(135deg, #db2777, #a855f7)',
    'linear-gradient(135deg, #0d9488, #10b981)',
    'linear-gradient(135deg, #f97316, #ef4444)',
    'linear-gradient(135deg, #2563eb, #6366f1)',
    'linear-gradient(135deg, #7c3aed, #4f46e5)',
];
const avatarTone = (name) => AVATAR_TONES[[...String(name)].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_TONES.length];
const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

// Single-hue horizontal bar list (magnitude)
const BarList = ({ rows, unit = '' }) => {
    const max = Math.max(...rows.map((r) => r.count), 1);
    return (
        <div className="pam-bars">
            {rows.map((r, i) => (
                <div className="pam-bar-row" key={r.name}>
                    <div className="pam-bar-name">{r.name}</div>
                    <div className="pam-bar-track" title={`${r.name}: ${fmt(r.count)}${unit}`}>
                        <span className="pam-bar-fill" style={{ width: `${(r.count / max) * 100}%`, animationDelay: `${i * 0.06}s` }} />
                    </div>
                    <div className="pam-bar-value">{fmt(r.count)}</div>
                </div>
            ))}
        </div>
    );
};

const CardHead = ({ title, sub, chip }) => (
    <div className="pam-card-head">
        <div>
            <h3>{title}</h3>
            {sub && <p>{sub}</p>}
        </div>
        {chip && <span className="pam-chip">{chip}</span>}
    </div>
);

export default function PAMDashboard() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setSessionUserData] = useState({});
    const [modules, setModules] = useState([]);
    const [sessionActionIds, setSessionActionIds] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            const dashboardMenu = parsedMenu.find((item) => item.MenuName === "Dashboard");

            let actionIds = [];
            if (dashboardMenu?.ActionsIds) {
                actionIds = actionIds.concat(dashboardMenu.ActionsIds.split(",").map(Number));
            }
            if (actionIds.length > 0) {
                setSessionActionIds([...new Set(actionIds)]);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchMenuData = async () => {
        try {
            const sessionAccessModules = sessionStorage.getItem("accessModules");
            if (sessionAccessModules) {
                setModules(JSON.parse(sessionAccessModules));
                return;
            }

            const response = await fetchWithAuth("auth/getModules", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                const allModules = data.ResultData || [];
                const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
                const accessIds = userData?.AccessToModules ? userData.AccessToModules.split(",").map(Number) : [];
                const filteredModules = allModules.filter((mod) => accessIds.includes(mod.Id));

                setModules(filteredModules);
                sessionStorage.setItem("accessModules", JSON.stringify(filteredModules));
            } else {
                console.error("Failed to fetch menu data:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching menu data:", error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) fetchMenuData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionUserData]);

    const handleModuleClick = async (mod) => {
        localStorage.setItem("ModuleData", JSON.stringify(mod));
        const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
        const unavailable = () =>
            Swal.fire({
                icon: 'warning',
                title: 'Module unavailable',
                text: 'You don’t have access to this module yet. Please contact your administrator for help.',
                confirmButtonText: 'OK'
            });

        try {
            const response = await fetchWithAuth(
                `auth/getmenu?OrgId=${userData.OrgId}&RoleId=${userData.RoleId}&ModuleId=${mod.Id}&UserId=${userData.Id}`,
                { method: "GET", headers: { "Content-Type": "application/json" } }
            );

            if (response.ok) {
                const data = await response.json();
                const menuList = data.ResultData;
                if (menuList.length > 0 && menuList[0].MenuPath) {
                    sessionStorage.setItem("menuData", JSON.stringify(menuList));
                    sessionStorage.setItem("navigationPath", menuList[0].MenuPath);
                    navigate(menuList[0].MenuPath);
                } else {
                    unavailable();
                }
            } else {
                unavailable();
            }
        } catch (error) {
            console.error("Menu fetch error:", error);
        }
    };

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    // Same module list for desktop + mobile dropdowns
    const moduleMenuItems = (
        <ul className="dropdown-menu shadow">
            {modules.map((mod, index) => {
                const isActive = location.pathname.toLowerCase().includes(mod.ModuleName.toLowerCase());
                return (
                    <li key={index} className={`mb-1 ${isActive ? "active-module" : ""}`}>
                        <a className="dropdown-item d-flex align-items-center gap-2 module-item" onClick={() => handleModuleClick(mod)} style={{ cursor: "pointer" }}>
                            <i className={`fas fa-${mod.ImageIcon}`} style={{ color: iconColors[index % iconColors.length], textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}></i>
                            <span>{mod.ModuleName}</span>
                        </a>
                    </li>
                );
            })}
            {sessionUserData?.RoleId === 1 && (
                <a href="https://betasuperportal.cooperwind.online/" target="_blank" rel="noreferrer">
                    <li className="dropdown-item d-flex align-items-center gap-2 module-item">
                        <i className="fa-solid fa-user-tie" style={{ color: '#c8e6c9', textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)' }}></i>
                        <span>Super Portal</span>
                    </li>
                </a>
            )}
            <li className="dropdown-item d-flex align-items-center gap-2 module-item" onClick={() => navigate("/user-modules")} style={{ cursor: "pointer" }}>
                <i className="fa-solid fa-arrow-left" style={{ color: "#ffccbc", textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}></i>
                <span>Go Back to Portal</span>
            </li>
        </ul>
    );

    // =============================================================
    // DASHBOARD DERIVED VALUES
    // =============================================================
    const monthlyMax = useMemo(() => Math.max(...MONTHLY_CONTENT.map((d) => d.v)), []);
    const monthlyTotal = useMemo(() => MONTHLY_CONTENT.reduce((a, d) => a + d.v, 0), []);
    const typeTotal = useMemo(() => CONTENT_TYPES.reduce((a, t) => a + t.count, 0), []);
    const gridSteps = [1, 0.75, 0.5, 0.25, 0].map((f) => Math.round((monthlyMax * f) / 10) * 10);

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    // =============================================================
    // RENDER
    // =============================================================
    return (
        <Base1>
            <div className="d-flex flex-column flex-column-fluid">
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className="page-title d-md-block d-none">
                            <div className="dropdown d-inline-block">
                                <span className="menu-link bg-white shadow-sm me-2 dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <span className="menu-title"><i className="fa-solid fa-grip me-1"></i> Portal</span>
                                </span>
                                {moduleMenuItems}
                            </div>
                        </div>

                        <div className="page-title d-md-none d-block">
                            <div className="dropdown d-inline-block">
                                <span className="menu-link bg-white shadow-sm me-2 dropdown-toggle" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                                    <span className="menu-title"><i className="fa-solid fa-grip me-1"></i></span>
                                </span>
                                {moduleMenuItems}
                            </div>
                            <span className="menu-link bg-white shadow-sm me-2 cursor-pointer active">
                                <span className="menu-title"><i className="fa-solid fa-border-all"></i></span>
                                <span className="menu-arrow"></span>
                            </span>
                        </div>
                    </div>
                </div>

                <div id="kt_app_content" className="app-content flex-column-fluid">
                    <div id="kt_app_content_container" className="app-container container-xxl mb-15">
                        <div className="pam">

                            {/* ---------- Welcome header ---------- */}
                            <div className="pam-welcome">
                                <div>
                                    <div className="pam-eyebrow">{today}</div>
                                    <h1 className="pam-title">{greeting()}, {sessionUserData?.UserName || sessionUserData?.Name || 'there'}</h1>
                                    <p className="pam-sub">Here’s what’s happening across your website, users, customers and careers.</p>
                                </div>
                                <span className="pam-live"><span className="pam-live-dot" />Sample data</span>
                            </div>

                            {/* ---------- KPIs ---------- */}
                            <div className="pam-kpis">
                                {KPIS.map((k) => (
                                    <div key={k.key} className={`pam-kpi ${k.hero ? 'hero' : ''}`}>
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className={`pam-kpi-icon ${k.tone || ''}`}><i className={`fa-solid ${k.icon}`} /></div>
                                            <span className="pam-delta"><i className="fa-solid fa-arrow-trend-up me-1" />{k.delta}</span>
                                        </div>
                                        <div className="pam-kpi-value">{fmt(k.value)}</div>
                                        <div className="pam-kpi-label">{k.label} <span>· {k.delta} {k.note}</span></div>
                                    </div>
                                ))}
                            </div>

                            {/* ---------- Row 2: content activity + content types ---------- */}
                            <div className="row g-5 mb-5">
                                <div className="col-xl-8">
                                    <div className="pam-card h-100">
                                        <CardHead title="Content published" sub="Website contents published per month, last 12 months" chip={`${fmt(monthlyTotal)} total`} />
                                        <div className="pam-cols">
                                            <div className="pam-cols-grid">
                                                {gridSteps.map((g, i) => (
                                                    <div key={i} className="pam-grid-line"><span>{g}</span></div>
                                                ))}
                                            </div>
                                            <div className="pam-cols-bars">
                                                {MONTHLY_CONTENT.map((d, i) => {
                                                    const isLast = i === MONTHLY_CONTENT.length - 1;
                                                    return (
                                                        <div key={d.m} className="pam-col" data-tip={`${d.m}: ${d.v} contents${isLast ? ' (month to date)' : ''}`}>
                                                            <span
                                                                className={`pam-col-fill ${isLast ? 'partial' : ''}`}
                                                                style={{ height: `${(d.v / monthlyMax) * 100}%`, animationDelay: `${i * 0.04}s` }}
                                                            />
                                                            <span className="pam-col-label">{d.m}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-xl-4">
                                    <div className="pam-card h-100">
                                        <CardHead title="Content by type" sub="Share of all website contents" chip={`${CONTENT_TYPES.length} types`} />
                                        <div className="pam-mix-bar">
                                            {CONTENT_TYPES.map((t) => (
                                                <span key={t.name} className="pam-mix-seg" title={`${t.name}: ${t.count}`} style={{ flexGrow: t.count, background: t.color }} />
                                            ))}
                                        </div>
                                        <div className="pam-mix-list">
                                            {CONTENT_TYPES.map((t) => (
                                                <div key={t.name} className="pam-mix-row">
                                                    <span className="pam-mix-dot" style={{ background: t.color }} />
                                                    <span className="pam-mix-name">{t.name}</span>
                                                    <span className="pam-mix-count">{fmt(t.count)}</span>
                                                    <span className="pam-mix-pct">{Math.round((t.count / typeTotal) * 100)}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ---------- Row 3: recent contents + activity ---------- */}
                            <div className="row g-5 mb-5">
                                <div className="col-xl-8">
                                    <div className="pam-card h-100">
                                        <CardHead title="Recent contents" sub="Latest updates across the website" />
                                        <div className="table-responsive">
                                            <table className="pam-table">
                                                <thead>
                                                    <tr>
                                                        <th>Title</th>
                                                        <th>Type</th>
                                                        <th>Author</th>
                                                        <th>Status</th>
                                                        <th className="text-end">Updated</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {RECENT_CONTENTS.map((c) => {
                                                        const s = STATUS[c.status];
                                                        const t = CONTENT_TYPES.find((x) => x.name === c.type);
                                                        return (
                                                            <tr key={c.id}>
                                                                <td className="pam-strong">{c.title}</td>
                                                                <td>
                                                                    <span className="pam-type"><span className="pam-mix-dot sm" style={{ background: t?.color }} />{c.type}</span>
                                                                </td>
                                                                <td>
                                                                    <div className="d-flex align-items-center gap-2">
                                                                        <span className="pam-avatar" style={{ background: avatarTone(c.author) }}>{initialsOf(c.author)}</span>
                                                                        <span className="text-nowrap">{c.author}</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className="pam-status" style={{ background: s.bg, color: s.color }}>
                                                                        <i className={`fa-solid ${s.icon}`} />{c.status}
                                                                    </span>
                                                                </td>
                                                                <td className="text-end pam-muted text-nowrap">{formatDate(c.updated)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-xl-4">
                                    <div className="pam-card h-100">
                                        <CardHead title="Recent activity" sub="Across all portal screens" />
                                        <div className="pam-timeline">
                                            {ACTIVITY.map((a, i) => (
                                                <div key={i} className="pam-tl-item">
                                                    <span className={`pam-tl-icon ${a.tone}`}><i className={`fa-solid ${a.icon}`} /></span>
                                                    <div className="min-w-0">
                                                        <div className="pam-tl-text">{a.text}</div>
                                                        <div className="pam-tl-time">{a.time}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ---------- Row 4: users, customers, careers ---------- */}
                            <div className="row g-5">
                                <div className="col-xl-4 col-md-6">
                                    <div className="pam-card h-100">
                                        <CardHead title="Users by role" sub="Portal accounts" chip="231 active · 17 inactive" />
                                        <BarList rows={USERS_BY_ROLE} unit=" users" />
                                    </div>
                                </div>
                                <div className="col-xl-4 col-md-6">
                                    <div className="pam-card h-100">
                                        <CardHead title="Customers by industry" sub="Top 5 industries" chip="412 total" />
                                        <BarList rows={CUSTOMERS_BY_INDUSTRY} unit=" customers" />
                                    </div>
                                </div>
                                <div className="col-xl-4">
                                    <div className="pam-card h-100">
                                        <CardHead title="Hiring pipeline" sub="Applications across 14 open jobs" chip="3.2% hired" />
                                        <BarList rows={HIRING_FUNNEL} unit=" candidates" />
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <style>{styles}</style>
        </Base1>
    );
}

// =============================================================
// STYLES — scoped under .pam so nothing leaks into the portal
// =============================================================
const styles = `
.pam {
    --pam-ink: #0f172a; --pam-ink-2: #334155; --pam-muted: #64748b; --pam-line: #e8ecf4;
    --pam-brand: #4f46e5; --pam-brand-2: #7c3aed;
    --pam-shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 32px -14px rgba(30,27,75,.16);
    color: var(--pam-ink);
}
.pam .min-w-0 { min-width: 0; }

/* Welcome */
.pam-welcome { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
.pam-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--pam-brand); }
.pam-title { margin: 6px 0 0; font-size: 28px; font-weight: 800; letter-spacing: -.02em; color: var(--pam-ink); }
.pam-sub { margin: 4px 0 0; color: var(--pam-muted); font-size: 14px; }
.pam-live { display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; background: #fff; border: 1px solid var(--pam-line); font-size: 12.5px; font-weight: 600; color: var(--pam-ink-2); }
.pam-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 4px rgba(16,185,129,.15); }

/* KPIs */
.pam-kpis { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 20px; margin-bottom: 20px; }
.pam-kpi { position: relative; overflow: hidden; padding: 22px; border-radius: 20px; background: #fff; border: 1px solid var(--pam-line); box-shadow: var(--pam-shadow); transition: transform .2s; animation: pamRise .5s cubic-bezier(.2,.8,.2,1) backwards; }
.pam-kpi:nth-child(2) { animation-delay: .05s; } .pam-kpi:nth-child(3) { animation-delay: .1s; } .pam-kpi:nth-child(4) { animation-delay: .15s; }
.pam-kpi:hover { transform: translateY(-2px); }
.pam-kpi.hero { color: #fff; border: 0; background: linear-gradient(135deg, #312e81 0%, #4338ca 55%, #7c3aed 100%); box-shadow: 0 18px 36px -16px rgba(67,56,202,.7); }
.pam-kpi.hero::after { content: ""; position: absolute; right: -40px; bottom: -60px; width: 180px; height: 180px; border-radius: 50%; background: rgba(255,255,255,.08); }
.pam-kpi-icon { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; font-size: 18px; margin-bottom: 20px; background: rgba(255,255,255,.16); color: #fff; }
.pam-kpi-icon.indigo { background: #eef2ff; color: #4f46e5; }
.pam-kpi-icon.green { background: #e7f8ef; color: #059669; }
.pam-kpi-icon.amber { background: #fff7e0; color: #d97706; }
.pam-delta { padding: 4px 10px; border-radius: 999px; background: #e7f8ef; color: #047857; font-size: 11.5px; font-weight: 700; }
.pam-kpi.hero .pam-delta { background: rgba(255,255,255,.16); color: #fff; }
.pam-kpi-value { font-size: 34px; font-weight: 800; line-height: 1; letter-spacing: -.02em; }
.pam-kpi-label { margin-top: 8px; font-size: 13.5px; color: var(--pam-muted); }
.pam-kpi-label span { font-size: 12px; opacity: .8; }
.pam-kpi.hero .pam-kpi-label { color: rgba(255,255,255,.82); }

/* Cards */
.pam-card { background: #fff; border: 1px solid var(--pam-line); border-radius: 20px; box-shadow: var(--pam-shadow); padding: 24px; }
.pam-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.pam-card-head h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--pam-ink); }
.pam-card-head p { margin: 3px 0 0; font-size: 13px; color: var(--pam-muted); }
.pam-chip { flex: none; padding: 5px 11px; border-radius: 9px; background: #f8fafc; border: 1px solid var(--pam-line); font-size: 12px; font-weight: 700; color: var(--pam-ink-2); white-space: nowrap; }

/* Column chart */
.pam-cols { position: relative; height: 260px; padding-left: 34px; }
.pam-cols-grid { position: absolute; inset: 0 0 26px 0; display: flex; flex-direction: column; justify-content: space-between; }
.pam-grid-line { border-top: 1px dashed #eef0f6; position: relative; }
.pam-grid-line span { position: absolute; left: 0; top: -9px; font-size: 11px; color: #94a3b8; }
.pam-cols-bars { position: absolute; inset: 0 0 0 34px; display: flex; align-items: flex-end; gap: 2%; padding-bottom: 26px; }
.pam-col { position: relative; flex: 1; height: 100%; display: flex; align-items: flex-end; justify-content: center; cursor: default; }
.pam-col-fill { width: 100%; max-width: 30px; border-radius: 4px 4px 0 0; background: #6366f1; animation: pamGrowY .8s cubic-bezier(.2,.8,.2,1) backwards; transform-origin: bottom; transition: background .15s; }
.pam-col-fill.partial { background: repeating-linear-gradient(135deg, #a5b4fc 0 5px, #c7d2fe 5px 10px); }
.pam-col:hover .pam-col-fill { background: #4338ca; }
.pam-col-label { position: absolute; bottom: -24px; font-size: 11.5px; color: var(--pam-muted); }
.pam-col::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 6px); left: 50%; transform: translateX(-50%); padding: 6px 10px; border-radius: 8px; background: #0f172a; color: #fff; font-size: 12px; font-weight: 600; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity .15s; z-index: 2; }
.pam-col:hover::after { opacity: 1; }

/* Content type mix */
.pam-mix-bar { display: flex; height: 14px; border-radius: 99px; overflow: hidden; gap: 2px; margin-bottom: 18px; }
.pam-mix-seg { flex-basis: 0; animation: pamGrowX .9s cubic-bezier(.2,.8,.2,1) backwards; transform-origin: left; }
.pam-mix-row { display: grid; grid-template-columns: 12px 1fr auto 44px; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f4f9; font-size: 13.5px; }
.pam-mix-row:last-child { border-bottom: 0; }
.pam-mix-dot { width: 12px; height: 12px; border-radius: 4px; display: inline-block; }
.pam-mix-dot.sm { width: 8px; height: 8px; border-radius: 3px; }
.pam-mix-name { color: var(--pam-ink-2); }
.pam-mix-count { text-align: right; font-weight: 800; color: var(--pam-ink); }
.pam-mix-pct { text-align: right; color: var(--pam-muted); }

/* Table */
.pam-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 640px; }
.pam-table th { padding: 11px 14px; background: #f7f9fc; color: var(--pam-muted); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.pam-table th:first-child { border-radius: 12px 0 0 12px; } .pam-table th:last-child { border-radius: 0 12px 12px 0; }
.pam-table td { padding: 13px 14px; border-bottom: 1px solid #f1f4f9; font-size: 13.5px; color: var(--pam-ink-2); vertical-align: middle; }
.pam-table tbody tr:last-child td { border-bottom: 0; }
.pam-table tbody tr:hover td { background: #f8f9ff; }
.pam-strong { font-weight: 700; color: var(--pam-ink) !important; }
.pam-muted { color: var(--pam-muted) !important; }
.pam-type { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; }
.pam-avatar { flex: none; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; color: #fff; font-size: 10.5px; font-weight: 800; }
.pam-status { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.pam-status i { font-size: 10.5px; }

/* Timeline */
.pam-timeline { display: flex; flex-direction: column; }
.pam-tl-item { position: relative; display: flex; gap: 12px; padding-bottom: 18px; }
.pam-tl-item:not(:last-child)::before { content: ""; position: absolute; left: 17px; top: 38px; bottom: 4px; width: 2px; background: #eef0f6; }
.pam-tl-icon { flex: none; width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; font-size: 14px; }
.pam-tl-icon.indigo { background: #eef2ff; color: #4f46e5; }
.pam-tl-icon.green { background: #e7f8ef; color: #059669; }
.pam-tl-icon.amber { background: #fff7e0; color: #d97706; }
.pam-tl-icon.pink { background: #fdecf5; color: #db2777; }
.pam-tl-icon.blue { background: #e8f1ff; color: #1d4ed8; }
.pam-tl-text { font-size: 13.5px; color: var(--pam-ink-2); line-height: 1.45; }
.pam-tl-text b { color: var(--pam-ink); }
.pam-tl-time { margin-top: 2px; font-size: 12px; color: #94a3b8; }

/* Bar list */
.pam-bars { display: flex; flex-direction: column; gap: 14px; }
.pam-bar-row { display: grid; grid-template-columns: 110px 1fr 44px; align-items: center; gap: 12px; }
.pam-bar-name { font-size: 13px; color: var(--pam-ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pam-bar-track { height: 10px; border-radius: 99px; background: #eef0f6; overflow: hidden; }
.pam-bar-fill { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #4338ca, #6366f1); animation: pamGrowX .9s cubic-bezier(.2,.8,.2,1) backwards; transform-origin: left; }
.pam-bar-value { text-align: right; font-size: 13.5px; font-weight: 800; color: var(--pam-ink); }

/* Motion */
@keyframes pamRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes pamGrowX { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes pamGrowY { from { transform: scaleY(0); } to { transform: scaleY(1); } }

/* Responsive */
@media (max-width: 1199.98px) { .pam-kpis { grid-template-columns: repeat(2, minmax(0,1fr)); } }
@media (max-width: 767.98px) {
    .pam-title { font-size: 23px; }
    .pam-kpis { gap: 12px; }
    .pam-kpi { padding: 18px; }
    .pam-kpi-value { font-size: 28px; }
    .pam-card { padding: 18px; }
    .pam-cols { height: 220px; }
}
@media (max-width: 479.98px) { .pam-kpis { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .pam * { animation: none !important; transition: none !important; } }
`;