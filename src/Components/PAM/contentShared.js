// =============================================================
// Shared static data, helpers and styles for Content Types + Contents
// (replace the seed arrays with API calls later)
// =============================================================

export const CONTENT_TYPES_SEED = [
    { TypeId: 1, Name: "Blogs", Slug: "blogs", Description: "Articles and thought-leadership posts", Color: "#4f46e5", IsActive: 1, CreatedOn: "2026-06-02" },
    { TypeId: 2, Name: "Products", Slug: "products", Description: "Product pages and spec sheets", Color: "#0ea5e9", IsActive: 1, CreatedOn: "2026-06-02" },
    { TypeId: 3, Name: "News", Slug: "news", Description: "Company news and press releases", Color: "#d97706", IsActive: 1, CreatedOn: "2026-06-10" },
    { TypeId: 4, Name: "Case Studies", Slug: "case-studies", Description: "Customer success stories", Color: "#10b981", IsActive: 1, CreatedOn: "2026-07-01" },
    { TypeId: 5, Name: "Events", Slug: "events", Description: "Exhibitions, webinars and meets", Color: "#db2777", IsActive: 1, CreatedOn: "2026-07-18" },
    { TypeId: 6, Name: "Banners", Slug: "banners", Description: "Homepage and campaign banners", Color: "#7c3aed", IsActive: 0, CreatedOn: "2026-08-05" },
];

export const CONTENTS_SEED = [
    { ContentId: 101, TypeId: 2, Title: "5 MW Turbine Gearbox Launch", Slug: "5-mw-turbine-gearbox-launch", Summary: "Our new gearbox for 5 MW class turbines with 12% better efficiency.", Body: "", CoverImage: "", Tags: ["Gearbox", "Launch"], Status: "PUBLISHED", PublishDate: "2026-10-13", Author: "Pitchaipandi G", Featured: 1, UpdatedOn: "2026-10-13" },
    { ContentId: 102, TypeId: 5, Title: "Cooper Wind at Windergy India 2026", Slug: "windergy-india-2026", Summary: "Meet us at Hall 3, Stall B12 in Chennai.", Body: "", CoverImage: "", Tags: ["Expo"], Status: "SCHEDULED", PublishDate: "2026-10-20", Author: "Reshma Q", Featured: 0, UpdatedOn: "2026-10-12" },
    { ContentId: 103, TypeId: 4, Title: "How We Cut Nacelle Downtime by 32%", Slug: "nacelle-downtime-case-study", Summary: "Predictive maintenance programme with a Tamil Nadu wind farm.", Body: "", CoverImage: "", Tags: ["Maintenance", "O&M"], Status: "DRAFT", PublishDate: "", Author: "RajKumar M", Featured: 0, UpdatedOn: "2026-10-11" },
    { ContentId: 104, TypeId: 1, Title: "Monsoon Maintenance Checklist", Slug: "monsoon-maintenance-checklist", Summary: "Ten checks every site team should run before the monsoon.", Body: "", CoverImage: "", Tags: ["Maintenance"], Status: "PUBLISHED", PublishDate: "2026-10-10", Author: "Ravinath Q", Featured: 1, UpdatedOn: "2026-10-10" },
    { ContentId: 105, TypeId: 3, Title: "Q3 Production Milestone Crossed", Slug: "q3-production-milestone", Summary: "1,000th gearbox rolled out of the Chennai plant.", Body: "", CoverImage: "", Tags: ["Milestone"], Status: "DRAFT", PublishDate: "", Author: "Soundariya", Featured: 0, UpdatedOn: "2026-10-09" },
    { ContentId: 106, TypeId: 6, Title: "Diwali Homepage Banner", Slug: "diwali-banner-2026", Summary: "Festive greeting banner for the homepage hero.", Body: "", CoverImage: "", Tags: ["Festive"], Status: "SCHEDULED", PublishDate: "2026-10-28", Author: "Reshma Q", Featured: 0, UpdatedOn: "2026-10-08" },
    { ContentId: 107, TypeId: 1, Title: "Choosing the Right Bearing Grease", Slug: "choosing-bearing-grease", Summary: "Viscosity, temperature range and re-lubrication intervals explained.", Body: "", CoverImage: "", Tags: ["Bearings", "Guide"], Status: "PUBLISHED", PublishDate: "2026-09-28", Author: "Pitchaipandi G", Featured: 0, UpdatedOn: "2026-09-28" },
    { ContentId: 108, TypeId: 2, Title: "Yaw Drive Series YD-400", Slug: "yaw-drive-yd-400", Summary: "Compact yaw drive for 2–3 MW turbines.", Body: "", CoverImage: "", Tags: ["Yaw Drive"], Status: "PUBLISHED", PublishDate: "2026-09-15", Author: "RajKumar M", Featured: 1, UpdatedOn: "2026-09-20" },
];

export const CONTENT_STATUSES = [
    { value: "DRAFT", label: "Draft", color: "#64748b", icon: "fa-pen" },
    { value: "PUBLISHED", label: "Published", color: "#059669", icon: "fa-circle-check" },
    { value: "SCHEDULED", label: "Scheduled", color: "#2563eb", icon: "fa-clock" },
    { value: "ARCHIVED", label: "Archived", color: "#b45309", icon: "fa-box-archive" },
];

// Fixed order for new types (validated categorical palette)
export const TYPE_COLORS = ["#4f46e5", "#0ea5e9", "#d97706", "#10b981", "#db2777", "#7c3aed"];

export const slugify = (s = "") =>
    s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");

export const today = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (d) =>
    d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const initials = (t = "") =>
    t.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export const statusMeta = (v) => CONTENT_STATUSES.find((s) => s.value === v) || CONTENT_STATUSES[0];

// =============================================================
// Styles (prefixed .cm- so nothing leaks)
// =============================================================
export const CONTENT_STYLES = `
.cm-card{background:#fff;border:1px solid #eef0f4;border-radius:16px;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.cm-header{position:relative;overflow:hidden;padding:20px 24px;background:linear-gradient(120deg,#fff 55%,#f1f5ff 100%)}
.cm-header::after{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(79,124,247,.12),transparent 70%);pointer-events:none}
.cm-head-icon{width:50px;height:50px;border-radius:14px;background:linear-gradient(135deg,#4f7cf7,#2f5be0);color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(79,124,247,.3)}
.cm-crumb{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#8a94a6}
.cm-btn{border:0;border-radius:10px;padding:10px 20px;font-weight:600;font-size:13.5px;color:#fff;background:linear-gradient(135deg,#4f7cf7,#2f5be0);box-shadow:0 6px 16px rgba(79,124,247,.3);transition:filter .15s}
.cm-btn:hover{filter:brightness(1.06);color:#fff}
.cm-btn:disabled{opacity:.6}
.cm-btn-light{border:1px solid #e6e9ef;border-radius:10px;padding:10px 20px;font-weight:600;font-size:13.5px;color:#4b5563;background:#fff}
.cm-btn-light:hover{background:#f7f8fa}
.cm-icon-btn{width:34px;height:34px;border-radius:10px;border:1px solid #eef0f4;background:#fff;color:#6b7280;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;font-size:13px}
.cm-icon-btn:hover{color:#4f7cf7;border-color:#d6defa;background:#f5f8ff}
.cm-icon-btn.danger:hover{color:#e5534b;border-color:#f6d0ce;background:#fff5f5}
.cm-search{background:#f7f8fa;border:1px solid transparent;border-radius:10px;padding:10px 14px 10px 38px;font-size:13px;width:100%;transition:all .15s}
.cm-search:focus{outline:0;background:#fff;border-color:#d6defa;box-shadow:0 0 0 4px rgba(79,124,247,.08)}
.cm-search-wrap{position:relative}
.cm-search-wrap>i{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#9aa3b2;font-size:13px}
.cm-table{width:100%;border-collapse:separate;border-spacing:0}
.cm-table th{background:#fafbfc;color:#8a94a6;font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;padding:12px 14px;white-space:nowrap}
.cm-table th:first-child{border-radius:10px 0 0 10px}
.cm-table th:last-child{border-radius:0 10px 10px 0}
.cm-table td{padding:14px;border-bottom:1px solid #f2f3f6;color:#4b5563;font-size:13.5px;vertical-align:middle}
.cm-table tbody tr:last-child td{border-bottom:0}
.cm-table tbody tr{transition:background .15s}
.cm-table tbody tr:hover{background:#fafbff}
.cm-table tbody tr.editing{background:#f3f6ff}
.cm-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:500;white-space:nowrap}
.cm-dot{width:8px;height:8px;border-radius:3px;display:inline-block;flex:none}
.cm-tile{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:none}
.cm-label{font-size:12.5px;font-weight:600;color:#374151;margin-bottom:6px;display:block}
.cm-label.req::after{content:" *";color:#e5534b}
.cm-input{width:100%;background:#fff;border:1px solid #e6e9ef;border-radius:10px;padding:10px 12px;font-size:13.5px;color:#1f2937;transition:all .15s}
.cm-input:focus{outline:0;border-color:#c9d6fb;box-shadow:0 0 0 4px rgba(79,124,247,.08)}
.cm-hint{font-size:11.5px;color:#9aa3b2;margin-top:5px}
.cm-err{font-size:11.5px;color:#e5534b;margin-top:5px}
.cm-swatch{width:26px;height:26px;border-radius:8px;border:2px solid #fff;box-shadow:0 0 0 1px #e6e9ef;cursor:pointer;transition:transform .15s}
.cm-swatch.on{box-shadow:0 0 0 2px #1f2937;transform:scale(1.08)}
.cm-chip{border:1px solid #eef0f4;background:#fff;color:#4b5563;border-radius:30px;padding:7px 14px;font-size:12.5px;font-weight:500;display:inline-flex;align-items:center;gap:7px;transition:all .15s;white-space:nowrap}
.cm-chip:hover{border-color:#d6defa}
.cm-chip.on{background:#1f2937;border-color:#1f2937;color:#fff}
.cm-chip .cnt{background:#f1f3f7;color:#6b7280;border-radius:20px;padding:1px 8px;font-size:11px;font-weight:600}
.cm-chip.on .cnt{background:rgba(255,255,255,.18);color:#fff}
.cm-sticky{position:sticky;top:90px}
.cm-empty{text-align:center;padding:48px 16px;color:#8a94a6}
.cm-empty i{font-size:30px;color:#cbd2dc;display:block;margin-bottom:10px}
.cm-ant .ant-select-selector{border-radius:10px!important;border-color:#e6e9ef!important;min-height:42px;align-items:center}
.cm-ant.ant-select-focused .ant-select-selector{border-color:#c9d6fb!important;box-shadow:0 0 0 4px rgba(79,124,247,.08)!important}
.cm-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.45);backdrop-filter:blur(2px);z-index:1055;animation:cmFade .2s}
.cm-panel{position:fixed;top:0;right:0;height:100vh;width:min(640px,100vw);background:#fff;z-index:1056;display:flex;flex-direction:column;box-shadow:-12px 0 40px rgba(15,23,42,.18);animation:cmSlide .25s ease-out}
.cm-panel-head{padding:18px 24px;border-bottom:1px solid #f0f1f5}
.cm-panel-body{flex:1;overflow-y:auto;padding:20px 24px}
.cm-panel-foot{padding:14px 24px;border-top:1px solid #f0f1f5;display:flex;justify-content:flex-end;gap:8px}
.cm-sec{background:#fafbfc;border:1px solid #f0f1f5;border-radius:14px;padding:18px;margin-bottom:14px}
.cm-sec-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8a94a6;margin-bottom:12px}
.cm-switch{width:36px!important;height:20px!important}
.cm-switch:checked{background-color:#22a06b!important;border-color:#22a06b!important}
@keyframes cmSlide{from{transform:translateX(100%)}to{transform:none}}
@keyframes cmFade{from{opacity:0}to{opacity:1}}
`;