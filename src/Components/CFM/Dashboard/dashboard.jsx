import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Base1 from '../../Config/Base1';
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../utils/api";

// =============================================================
// CFM Dashboard — customer feedback overview (static for now)
//
// Everything below the toolbar runs off RESPONSES. When the API is ready,
// replace RESPONSES with the fetched rows in the same shape — every number,
// chart, card and the side panel are worked out from it.
//
//   {
//     id, ref, name, designation, company, email, phone,
//     submittedOn: "YYYY-MM-DD", isNew,
//     ratings:  [10 numbers, 1-5, in PARAMETERS order],
//     comments: { liked, improve, issues, additional }   // any can be ""
//   }
// =============================================================

// Set to false when the dashboard goes live.
const COMING_SOON = true;

const PARAMETERS = [
    'Product Quality',
    'Dimensional Accuracy / Fitment',
    'Delivery Schedule Adherence',
    'Packing & Handling',
    'Documentation Provided',
    'Communication & Coordination',
    'Response to Queries',
    'Technical Support',
    'Issue / Complaint Resolution',
    'Overall Satisfaction',
];

const COMMENT_TYPES = {
    liked: { label: 'What they liked', short: 'What they liked', icon: 'bi-hand-thumbs-up-fill', tone: 'green', question: 'What did you like about our product/service?' },
    improve: { label: 'Improvements', short: 'Improvements', icon: 'bi-lightbulb-fill', tone: 'purple', question: 'What improvements do you suggest?' },
    issues: { label: 'Issues faced', short: 'Issues faced', icon: 'bi-exclamation-triangle-fill', tone: 'red', question: 'Did you face any issues?' },
    additional: { label: 'Additional', short: 'Additional', icon: 'bi-chat-dots-fill', tone: 'blue', question: 'Any additional feedback?' },
};

const SCALE = {
    5: { label: 'Excellent', color: '#4338ca' },
    4: { label: 'Very Good', color: '#818cf8' },
    3: { label: 'Good', color: '#9ca3af' },
    2: { label: 'Average', color: '#f87171' },
    1: { label: 'Poor', color: '#be123c' },
};

// ---- Static sample data (replace with the API) ----
const RESPONSES = [
    {
        id: 1, ref: 'FB-1042', name: 'Rajesh Menon', designation: 'Purchase Manager', company: 'Veltrix Engineering Pvt Ltd',
        email: 'rajesh.menon@veltrix.in', phone: '+91 98450 11223', submittedOn: '2026-09-23', isNew: true,
        ratings: [5, 5, 4, 4, 5, 4, 5, 4, 4, 5],
        comments: {
            liked: 'Excellent surface finish on the flange batch. Machining quality is consistently better than our previous vendor.',
            improve: 'Share dispatch tracking details on the same day of shipment.',
            issues: '',
            additional: 'Looking forward to extending the annual contract.',
        },
    },
    {
        id: 2, ref: 'FB-1041', name: 'Priya Natarajan', designation: 'Quality Head', company: 'Nilgiri Precision Works',
        email: 'priya.n@nilgiriprecision.com', phone: '+91 94430 55871', submittedOn: '2026-09-22', isNew: true,
        ratings: [4, 4, 2, 3, 4, 3, 3, 3, 3, 2],
        comments: {
            liked: 'Product quality is good and the material certificates were complete.',
            improve: 'Delivery commitments need to be more realistic. Please plan buffer time.',
            issues: 'Two consignments reached 6 days late, which held up our assembly line.',
            additional: '',
        },
    },
    {
        id: 3, ref: 'FB-1040', name: 'Arjun Reddy', designation: 'Plant Head', company: 'Deccan Gearworks',
        email: 'arjun.reddy@deccangear.com', phone: '+91 90000 43120', submittedOn: '2026-09-20', isNew: false,
        ratings: [5, 5, 5, 5, 5, 5, 5, 5, 4, 5],
        comments: {
            liked: 'Fitment was perfect on first trial. Your technical team supported us during installation too.',
            improve: '',
            issues: '',
            additional: 'Best supplier experience we have had this year. Keep it up!',
        },
    },
    {
        id: 4, ref: 'FB-1039', name: 'Meera Iyer', designation: 'Procurement Lead', company: 'Tarang Energy Systems',
        email: 'meera.iyer@tarangenergy.com', phone: '+91 98840 77412', submittedOn: '2026-09-18', isNew: true,
        ratings: [4, 4, 3, 4, 4, 4, 4, 3, 3, 4],
        comments: {
            liked: 'Quick response on queries and very cooperative coordination team.',
            improve: 'Packing for long-distance shipments could be sturdier.',
            issues: '',
            additional: '',
        },
    },
    {
        id: 5, ref: 'FB-1038', name: 'Vikram Shetty', designation: 'Maintenance Manager', company: 'Coastal Windtech',
        email: 'vikram.s@coastalwind.in', phone: '+91 97411 20934', submittedOn: '2026-09-16', isNew: false,
        ratings: [3, 3, 3, 2, 3, 4, 4, 3, 3, 3],
        comments: {
            liked: '',
            improve: 'Documentation should come along with the material, not a week later.',
            issues: 'Packing was damaged on two crates; we had to rework surface protection.',
            additional: '',
        },
    },
    {
        id: 6, ref: 'FB-1037', name: 'Ananya Kulkarni', designation: 'Supply Chain Manager', company: 'Sahyadri Turbines',
        email: 'ananya.k@sahyadriturbines.com', phone: '+91 99220 61873', submittedOn: '2026-09-14', isNew: false,
        ratings: [5, 4, 4, 4, 4, 5, 4, 4, 4, 4],
        comments: {
            liked: 'Consistent quality across three batches. Very few rejections at our end.',
            improve: 'A monthly delivery forecast would help our planning.',
            issues: '',
            additional: 'Thanks to the sales team for regular follow-ups.',
        },
    },
    {
        id: 7, ref: 'FB-1036', name: 'Suresh Babu', designation: 'Stores In-charge', company: 'Kaveri Castings',
        email: 'suresh.babu@kavericastings.com', phone: '+91 96000 18342', submittedOn: '2026-09-12', isNew: false,
        ratings: [4, 4, 4, 3, 3, 4, 4, 4, 4, 4],
        comments: {
            liked: 'Material identification tags were clear and easy to match with the PO.',
            improve: 'Invoices and packing lists should carry the PO line numbers.',
            issues: '',
            additional: '',
        },
    },
    {
        id: 8, ref: 'FB-1035', name: 'Fathima Rizwan', designation: 'QA Engineer', company: 'Marina Power Equipments',
        email: 'fathima.r@marinapower.in', phone: '+91 98402 66519', submittedOn: '2026-09-10', isNew: false,
        ratings: [3, 3, 4, 4, 4, 3, 3, 3, 3, 3],
        comments: {
            liked: '',
            improve: 'Inspection reports need more detail on dimensional checks.',
            issues: 'One lot had minor dimensional deviation on the bore; resolved after follow-up.',
            additional: 'Response to the complaint was polite but took time.',
        },
    },
    {
        id: 9, ref: 'FB-1034', name: 'Karthik Raman', designation: 'Project Engineer', company: 'Velan Infra Projects',
        email: 'karthik.raman@velaninfra.com', phone: '+91 94440 39281', submittedOn: '2026-09-08', isNew: false,
        ratings: [4, 4, 3, 4, 4, 4, 5, 4, 4, 4],
        comments: {
            liked: 'The team answered every query the same day.',
            improve: 'Share a single point of contact for project orders.',
            issues: '',
            additional: '',
        },
    },
    {
        id: 10, ref: 'FB-1033', name: 'Deepa Joseph', designation: 'Purchase Executive', company: 'Periyar Hydro Systems',
        email: 'deepa.joseph@periyarhydro.com', phone: '+91 98950 21765', submittedOn: '2026-09-05', isNew: false,
        ratings: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        comments: {
            liked: 'Pricing is fair for the quality delivered.',
            improve: '',
            issues: '',
            additional: 'Please include us in your new product briefings.',
        },
    },
    {
        id: 11, ref: 'FB-1032', name: 'Rohit Agarwal', designation: 'Operations Head', company: 'Thar Renewables',
        email: 'rohit.agarwal@thar-renew.com', phone: '+91 98290 44718', submittedOn: '2026-08-29', isNew: false,
        ratings: [3, 4, 2, 3, 4, 3, 3, 4, 3, 3],
        comments: {
            liked: 'Technical support during commissioning was helpful.',
            improve: 'Dispatch planning needs to account for monsoon transit delays.',
            issues: 'Delivery was late by a week and there was no prior intimation.',
            additional: '',
        },
    },
    {
        id: 12, ref: 'FB-1031', name: 'Lakshmi Prasad', designation: 'Vendor Development', company: 'Godavari Heavy Industries',
        email: 'lakshmi.p@godavariheavy.com', phone: '+91 93910 56247', submittedOn: '2026-08-24', isNew: false,
        ratings: [5, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        comments: {
            liked: 'Vendor audit went smoothly; your documentation was well organised.',
            improve: '',
            issues: '',
            additional: '',
        },
    },
    {
        id: 13, ref: 'FB-1030', name: 'Nikhil Joshi', designation: 'Purchase Manager', company: 'Narmada Pumps',
        email: 'nikhil.joshi@narmadapumps.in', phone: '+91 98250 33910', submittedOn: '2026-08-18', isNew: false,
        ratings: [4, 4, 3, 3, 3, 4, 3, 3, 3, 3],
        comments: {
            liked: '',
            improve: 'Share test certificates in advance by email.',
            issues: 'Test certificates were missing for one batch at the time of receipt.',
            additional: '',
        },
    },
    {
        id: 14, ref: 'FB-1029', name: 'Sneha Pillai', designation: 'Quality Manager', company: 'Malabar Marine Works',
        email: 'sneha.pillai@malabarmarine.com', phone: '+91 97450 81236', submittedOn: '2026-08-12', isNew: false,
        ratings: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
        comments: {
            liked: 'Corrosion protection on the parts held up well in our coastal storage.',
            improve: 'Provide a quick-reference handling guide with each shipment.',
            issues: 'One crate label was smudged and hard to read.',
            additional: '',
        },
    },
];

// ---- Helpers ----

const PERIODS = [
    { value: 'all', label: 'All time' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
];

const RATING_FILTERS = [
    { value: 'all', label: 'All ratings' },
    { value: 'high', label: '4.5 and above' },
    { value: 'good', label: '4.0 – 4.4' },
    { value: 'mid', label: '3.0 – 3.9' },
    { value: 'low', label: 'Below 3.0' },
];

const SORTS = [
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
    { value: 'highest', label: 'Highest rated' },
    { value: 'lowest', label: 'Lowest rated' },
];

const PAGE_SIZE = 9;

const avgOf = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);

const round1 = (value) => Math.round(value * 10) / 10;

const initialsOf = (name) =>
    String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const AVATAR_TONES = [
    'linear-gradient(135deg, #db2777, #a855f7)',
    'linear-gradient(135deg, #0d9488, #10b981)',
    'linear-gradient(135deg, #f97316, #ef4444)',
    'linear-gradient(135deg, #2563eb, #6366f1)',
    'linear-gradient(135deg, #7c3aed, #4f46e5)',
    'linear-gradient(135deg, #0891b2, #0ea5e9)',
];

const avatarTone = (name) =>
    AVATAR_TONES[[...String(name)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];

const formatDate = (iso, withYear = true) => {
    const date = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(date.getTime())) return iso;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}${withYear ? ` ${date.getFullYear()}` : ''}`;
};

const Stars = ({ value, size = 13 }) => (
    <span className="cfd-stars" style={{ fontSize: size }}>
        {[1, 2, 3, 4, 5].map((n) => (
            <i
                key={n}
                className={`bi ${
                    value >= n ? 'bi-star-fill' : value >= n - 0.5 ? 'bi-star-half' : 'bi-star'
                }`}
            ></i>
        ))}
    </span>
);

export default function CFMDashboard() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setSessionUserData] = useState({});
    const [modules, setModules] = useState([]);
    const [sessionActionIds, setSessionActionIds] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            // Find Dashboard and Visitors menus
            const dashboardMenu = parsedMenu.find(
                (item) => item.MenuName === "Dashboard"
            );

            let actionIds = [];
            if (dashboardMenu?.ActionsIds) {
                actionIds = actionIds.concat(
                    dashboardMenu.ActionsIds.split(",").map(Number)
                );
            }

            if (actionIds.length > 0) {
                // Remove duplicates just in case
                const uniqueActionIds = [...new Set(actionIds)];
                setSessionActionIds(uniqueActionIds);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchMenuData = async () => {
        try {
            // First check if accessModules already exists in sessionStorage
            const sessionAccessModules = sessionStorage.getItem("accessModules");

            if (sessionAccessModules) {
                // ✅ If already cached, just parse and set directly
                setModules(JSON.parse(sessionAccessModules));
                return; // stop further execution
            }

            // 🚀 Else fetch from API
            const response = await fetchWithAuth("auth/getModules", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                const allModules = data.ResultData || [];

                // Get user access IDs
                const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
                const accessIds = userData?.AccessToModules
                    ? userData.AccessToModules.split(",").map(Number)
                    : [];

                // Filter modules by access
                const filteredModules = allModules.filter((mod) =>
                    accessIds.includes(mod.Id)
                );

                // Save to state
                setModules(filteredModules);

                // 🔥 Cache in sessionStorage for next time
                sessionStorage.setItem("accessModules", JSON.stringify(filteredModules));
            } else {
                console.error("Failed to fetch menu data:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching menu data:", error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchMenuData();
        }
    }, [sessionUserData]);

    const handleModuleClick = async (mod) => {
        localStorage.setItem("ModuleData", JSON.stringify(mod));

        const sessionUserData = JSON.parse(sessionStorage.getItem("userData") || "{}");
        try {
            const response = await fetchWithAuth(`auth/getmenu?OrgId=${sessionUserData.OrgId}&RoleId=${sessionUserData.RoleId}&ModuleId=${mod.Id}&UserId=${sessionUserData.Id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
            );

            if (response.ok) {
                const data = await response.json();
                const menuList = data.ResultData;

                if (menuList.length > 0 && menuList[0].MenuPath) {
                    sessionStorage.setItem("menuData", JSON.stringify(menuList));
                    sessionStorage.setItem("navigationPath", menuList[0].MenuPath);
                    navigate(menuList[0].MenuPath);
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Module unavailable',
                        text: 'You don’t have access to this module yet. Please contact your administrator for help.',
                        confirmButtonText: 'OK'
                    });
                    console.warn("No menu path available.");
                }
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Module unavailable',
                    text: 'You don’t have access to this module yet. Please contact your administrator for help.',
                    confirmButtonText: 'OK'
                });
                console.error("Failed to fetch menu data");
            }
        } catch (error) {
            console.error("Menu fetch error:", error);
        }
    };


    // const showDeptDwn = sessionActionIds?.includes(25);
    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    // =============================================================
    // FEEDBACK DASHBOARD
    // =============================================================

    const [responses, setResponses] = useState(RESPONSES);

    const [period, setPeriod] = useState('all');
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState('comments');
    const [category, setCategory] = useState('all');
    const [ratingFilter, setRatingFilter] = useState('all');
    const [sort, setSort] = useState('newest');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    const [selectedId, setSelectedId] = useState(null);

    // Each response with its own average, so cards, table and panel agree.
    const withAvg = useMemo(
        () => responses.map((r) => ({ ...r, avg: round1(avgOf(r.ratings)) })),
        [responses]
    );

    // The period applies to everything on the page.
    const inPeriod = useMemo(() => {
        if (period === 'all') return withAvg;

        const days = Number(period);
        const from = new Date();
        from.setHours(0, 0, 0, 0);
        from.setDate(from.getDate() - days);

        return withAvg.filter((r) => new Date(`${r.submittedOn}T00:00:00`) >= from);
    }, [withAvg, period]);

    // ---- KPIs ----
    const kpis = useMemo(() => {
        const all = inPeriod.flatMap((r) => r.ratings);
        const satisfied = inPeriod.filter((r) => r.avg >= 4).length;
        const issues = inPeriod.filter((r) => r.comments.issues?.trim()).length;

        return {
            total: inPeriod.length,
            average: round1(avgOf(all)),
            satisfiedPct: inPeriod.length ? Math.round((satisfied / inPeriod.length) * 100) : 0,
            issues,
        };
    }, [inPeriod]);

    // ---- Average by parameter ----
    const paramAverages = useMemo(() => {
        const rows = PARAMETERS.map((name, i) => ({
            name,
            avg: round1(avgOf(inPeriod.map((r) => r.ratings[i]).filter(Boolean))),
        }));
        const lowest = rows.length ? Math.min(...rows.map((r) => r.avg)) : 0;
        return { rows, lowest };
    }, [inPeriod]);

    // ---- Rating mix ----
    const ratingMix = useMemo(() => {
        const all = inPeriod.flatMap((r) => r.ratings);
        const total = all.length || 1;

        return [5, 4, 3, 2, 1].map((star) => {
            const count = all.filter((v) => v === star).length;
            return { star, count, pct: Math.round((count / total) * 100), ...SCALE[star] };
        });
    }, [inPeriod]);

    // ---- Search, rating filter and sort (comments + responses) ----
    const matchesRating = (avg) => {
        if (ratingFilter === 'high') return avg >= 4.5;
        if (ratingFilter === 'good') return avg >= 4 && avg < 4.5;
        if (ratingFilter === 'mid') return avg >= 3 && avg < 4;
        if (ratingFilter === 'low') return avg < 3;
        return true;
    };

    const term = search.trim().toLowerCase();

    const filteredResponses = useMemo(() => {
        const list = inPeriod.filter((r) => {
            if (!matchesRating(r.avg)) return false;
            if (!term) return true;
            const hay = [r.name, r.company, r.designation, r.ref, ...Object.values(r.comments)]
                .join(' ')
                .toLowerCase();
            return hay.includes(term);
        });

        const byDate = (a, b) => b.submittedOn.localeCompare(a.submittedOn);

        return [...list].sort((a, b) => {
            if (sort === 'oldest') return -byDate(a, b);
            if (sort === 'highest') return b.avg - a.avg || byDate(a, b);
            if (sort === 'lowest') return a.avg - b.avg || byDate(a, b);
            return byDate(a, b);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inPeriod, ratingFilter, sort, term]);

    // One card per comment.
    const allComments = useMemo(
        () =>
            filteredResponses.flatMap((r) =>
                Object.keys(COMMENT_TYPES)
                    .filter((type) => r.comments[type]?.trim())
                    .filter((type) => !term || r.comments[type].toLowerCase().includes(term) ||
                        [r.name, r.company, r.designation, r.ref].join(' ').toLowerCase().includes(term))
                    .map((type) => ({ key: `${r.id}-${type}`, type, text: r.comments[type], response: r }))
            ),
        [filteredResponses, term]
    );

    const categoryCounts = useMemo(() => {
        const counts = { all: allComments.length };
        Object.keys(COMMENT_TYPES).forEach((type) => {
            counts[type] = allComments.filter((c) => c.type === type).length;
        });
        return counts;
    }, [allComments]);

    const shownComments = useMemo(
        () => (category === 'all' ? allComments : allComments.filter((c) => c.type === category)),
        [allComments, category]
    );

    // A new filter starts the list again from the top.
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [category, ratingFilter, sort, term, period, tab]);

    const unreadCount = inPeriod.filter((r) => r.isNew).length;

    // ---- Side panel ----
    const selected = COMING_SOON ? null : (withAvg.find((r) => r.id === selectedId) || null);

    const openResponse = (id) => {
        if (COMING_SOON) return;
        setSelectedId(id);
        // Opening it counts as read.
        setResponses((prev) => prev.map((r) => (r.id === id ? { ...r, isNew: false } : r)));
    };

    const closePanel = () => setSelectedId(null);

    useEffect(() => {
        if (!selected) return undefined;

        const onKey = (e) => e.key === 'Escape' && closePanel();
        document.addEventListener('keydown', onKey);
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
    }, [selected]);

    // ---- Export ----
    const exportCsv = () => {
        if (COMING_SOON) return;

        const quote = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const header = [
            'Reference', 'Name', 'Designation', 'Company', 'Email', 'Phone', 'Submitted On', 'Average',
            ...PARAMETERS, ...Object.values(COMMENT_TYPES).map((t) => t.label),
        ];
        const rows = filteredResponses.map((r) => [
            r.ref, r.name, r.designation, r.company, r.email, r.phone, r.submittedOn, r.avg.toFixed(1),
            ...r.ratings, ...Object.keys(COMMENT_TYPES).map((t) => r.comments[t]),
        ]);

        const csv = [header, ...rows].map((row) => row.map(quote).join(',')).join('\r\n');
        const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `customer-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Stops mouse AND keyboard reaching the blurred dashboard while it's locked
    const lockRef = (el) => {
        if (!el) return;
        if (COMING_SOON) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
    };

    // =============================================================
    // RENDER
    // =============================================================

    return (
        <Base1>
            <div className={`d-flex flex-column flex-column-fluid`}>
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className="page-title d-md-block d-none">
                            <div className="dropdown d-inline-block">
                                <span
                                    className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <span className="menu-title">
                                        <i className="fa-solid fa-grip me-1"></i> Portal
                                    </span>
                                </span>

                                <ul className="dropdown-menu shadow">
                                    {modules.map((mod, index) => {
                                        const isActive = location.pathname.toLowerCase().includes(
                                            mod.ModuleName.toLowerCase()
                                        );

                                        return (
                                            <li
                                                key={index}
                                                className={`mb-1 ${isActive ? "active-module" : ""}`}
                                            >
                                                <a
                                                    className="dropdown-item d-flex align-items-center gap-2 module-item"
                                                    onClick={() => handleModuleClick(mod)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <i
                                                        className={`fas fa-${mod.ImageIcon}`}
                                                        style={{
                                                            color: iconColors[index % iconColors.length],
                                                            textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                                        }}
                                                    ></i>
                                                    <span>{mod.ModuleName}</span>
                                                </a>
                                            </li>
                                        );
                                    })}
                                    {sessionUserData?.RoleId === 1 && (
                                        <a href={`https://betasuperportal.cooperwind.online/`} target="_blank" rel="noreferrer">
                                            <li className="dropdown-item d-flex align-items-center gap-2 module-item">
                                                <i
                                                    className={`fa-solid fa-user-tie`}
                                                    style={{
                                                        color: '#c8e6c9',
                                                        textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)',
                                                    }}
                                                ></i>
                                                <span>Super Portal</span>
                                            </li>
                                        </a>
                                    )}
                                    <li className="dropdown-item d-flex align-items-center gap-2 module-item"
                                        onClick={() => navigate("/user-modules")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <i
                                            className="fa-solid fa-arrow-left"
                                            style={{
                                                color: "#ffccbc",
                                                textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                            }}
                                        ></i>
                                        <span>Go Back to Portal</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="page-title d-md-none d-block">
                            <div className="dropdown d-inline-block">
                                <span
                                    className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <span className="menu-title">
                                        <i className="fa-solid fa-grip me-1"></i>
                                    </span>
                                </span>

                                <ul className="dropdown-menu shadow">
                                    {modules.map((mod, index) => {
                                        const isActive = location.pathname.toLowerCase().includes(
                                            mod.ModuleName.toLowerCase()
                                        );

                                        return (
                                            <li
                                                key={index}
                                                className={`mb-1 ${isActive ? "active-module" : ""}`}
                                            >
                                                <a
                                                    className="dropdown-item d-flex align-items-center gap-2 module-item"
                                                    onClick={() => handleModuleClick(mod)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <i
                                                        className={`fas fa-${mod.ImageIcon}`}
                                                        style={{
                                                            color: iconColors[index % iconColors.length],
                                                            textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                                        }}
                                                    ></i>
                                                    <span>{mod.ModuleName}</span>
                                                </a>
                                            </li>
                                        );
                                    })}
                                    {sessionUserData?.RoleId === 1 && (
                                        <a href={`https://betasuperportal.cooperwind.online/`} target="_blank" rel="noreferrer">
                                            <li className="dropdown-item d-flex align-items-center gap-2 module-item">
                                                <i
                                                    className={`fa-solid fa-user-tie`}
                                                    style={{
                                                        color: '#c8e6c9',
                                                        textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)',
                                                    }}
                                                ></i>
                                                <span>Super Portal</span>
                                            </li>
                                        </a>
                                    )}
                                    <li className="dropdown-item d-flex align-items-center gap-2 module-item"
                                        onClick={() => navigate("/user-modules")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <i
                                            className="fa-solid fa-arrow-left"
                                            style={{
                                                color: "#ffccbc",
                                                textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                            }}
                                        ></i>
                                        <span>Go Back to Portal</span>
                                    </li>
                                </ul>
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

                        {/* The dashboard sits inside this wrapper. While COMING_SOON is true it is
                            blurred and locked, and the message card floats above it. */}
                        <div className={`cfd-soon-wrap ${COMING_SOON ? 'is-locked' : ''}`}>

                            <div
                                className="cfd"
                                aria-hidden={COMING_SOON || undefined}
                                ref={lockRef}
                            >

                                {/* ================= HEADER ================= */}

                                <div className="cfd-head">
                                    <div className="min-w-0">
                                        <h1 className="cfd-title">Customer Feedback</h1>
                                        <p className="cfd-sub">All ratings and comments submitted through the feedback form.</p>
                                    </div>

                                    <div className="cfd-head-actions">
                                        <div className="cfd-search">
                                            <i className="bi bi-search"></i>
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="Search customer, company or comment…"
                                            />
                                            {search && (
                                                <button type="button" className="cfd-search-clear" onClick={() => setSearch('')}>
                                                    <i className="bi bi-x-lg"></i>
                                                </button>
                                            )}
                                        </div>

                                        <div className="cfd-select">
                                            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
                                                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                            </select>
                                            <i className="bi bi-chevron-down"></i>
                                        </div>

                                        <button type="button" className="cfd-btn-primary" onClick={exportCsv}>
                                            <i className="bi bi-download me-2"></i>Export CSV
                                        </button>
                                    </div>
                                </div>

                                {/* ================= KPIs ================= */}

                                <div className="cfd-kpis">
                                    <div className="cfd-kpi hero">
                                        <span className="cfd-kpi-icon"><i className="bi bi-inboxes-fill"></i></span>
                                        <div className="cfd-kpi-value">{kpis.total}</div>
                                        <div className="cfd-kpi-label">Total responses</div>
                                        {unreadCount > 0 && <span className="cfd-kpi-badge">{unreadCount} new</span>}
                                    </div>

                                    <div className="cfd-kpi">
                                        <span className="cfd-kpi-icon amber"><i className="bi bi-star-fill"></i></span>
                                        <div className="cfd-kpi-value">{kpis.average.toFixed(1)}<small>/5</small></div>
                                        <div className="cfd-kpi-label">Average rating</div>
                                    </div>

                                    <div className="cfd-kpi">
                                        <span className="cfd-kpi-icon green"><i className="bi bi-emoji-smile-fill"></i></span>
                                        <div className="cfd-kpi-value">{kpis.satisfiedPct}%</div>
                                        <div className="cfd-kpi-label">Satisfied (avg ≥ 4)</div>
                                    </div>

                                    <div className="cfd-kpi">
                                        <span className="cfd-kpi-icon red"><i className="bi bi-exclamation-octagon-fill"></i></span>
                                        <div className="cfd-kpi-value">{kpis.issues}</div>
                                        <div className="cfd-kpi-label">Issues reported</div>
                                    </div>
                                </div>

                                {/* ================= CHARTS ================= */}

                                <div className="row g-4 mb-5">
                                    <div className="col-12 col-xl-7">
                                        <div className="cfd-card h-100">
                                            <div className="cfd-card-head">
                                                <div>
                                                    <h3>Average by parameter</h3>
                                                    <p>Mean rating out of 5 across all responses</p>
                                                </div>
                                                {inPeriod.length > 0 && (
                                                    <span className="cfd-chip">
                                                        <i className="bi bi-arrow-down-right me-1"></i>
                                                        Lowest: {paramAverages.lowest.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>

                                            {inPeriod.length === 0 ? (
                                                <div className="cfd-empty">No responses in this period.</div>
                                            ) : (
                                                <div className="cfd-params">
                                                    {paramAverages.rows.map((row) => {
                                                        const weak = row.avg <= paramAverages.lowest + 0.05;
                                                        return (
                                                            <div className="cfd-param" key={row.name}>
                                                                <span className="cfd-param-name">{row.name}</span>
                                                                <span className="cfd-param-track">
                                                                    <span
                                                                        className="cfd-param-fill"
                                                                        style={{ width: `${(row.avg / 5) * 100}%` }}
                                                                    ></span>
                                                                </span>
                                                                <span className={`cfd-param-value ${weak ? 'weak' : ''}`}>
                                                                    {weak && <i className="bi bi-exclamation-triangle me-1"></i>}
                                                                    {row.avg.toFixed(1)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-12 col-xl-5">
                                        <div className="cfd-card h-100">
                                            <div className="cfd-card-head">
                                                <div>
                                                    <h3>Rating mix</h3>
                                                    <p>Share of every individual star rating given</p>
                                                </div>
                                            </div>

                                            <div className="cfd-mix-bar">
                                                {ratingMix.filter((m) => m.count > 0).map((m) => (
                                                    <span
                                                        key={m.star}
                                                        className="cfd-mix-seg"
                                                        style={{ flexGrow: m.count, background: m.color }}
                                                        title={`${m.star} · ${m.label}: ${m.pct}%`}
                                                    >
                                                        {m.pct >= 6 ? `${m.pct}%` : ''}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="cfd-mix-list">
                                                {ratingMix.map((m) => (
                                                    <div className="cfd-mix-row" key={m.star}>
                                                        <span className="cfd-mix-dot" style={{ background: m.color }}></span>
                                                        <span className="cfd-mix-name"><b>{m.star}</b> · {m.label}</span>
                                                        <span className="cfd-mix-count">{m.count}</span>
                                                        <span className="cfd-mix-pct">{m.pct}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* ================= COMMENTS / RESPONSES ================= */}

                                <div className="cfd-card">
                                    <div className="cfd-list-top">
                                        <div className="cfd-tabs">
                                            <button
                                                type="button"
                                                className={tab === 'comments' ? 'on' : ''}
                                                onClick={() => setTab('comments')}
                                            >
                                                <i className="bi bi-chat-square-quote me-2"></i>Comments
                                            </button>
                                            <button
                                                type="button"
                                                className={tab === 'responses' ? 'on' : ''}
                                                onClick={() => setTab('responses')}
                                            >
                                                <i className="bi bi-table me-2"></i>Responses
                                            </button>
                                        </div>

                                        <div className="cfd-list-filters">
                                            <div className="cfd-select">
                                                <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
                                                    {RATING_FILTERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                </select>
                                                <i className="bi bi-chevron-down"></i>
                                            </div>
                                            <div className="cfd-select">
                                                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                                                    {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                                </select>
                                                <i className="bi bi-chevron-down"></i>
                                            </div>
                                        </div>
                                    </div>

                                    {tab === 'comments' && (
                                        <>
                                            <div className="cfd-cats">
                                                <button
                                                    type="button"
                                                    className={`cfd-cat ${category === 'all' ? 'on' : ''}`}
                                                    onClick={() => setCategory('all')}
                                                >
                                                    <i className="bi bi-inbox me-2"></i>All comments
                                                    <span className="cfd-cat-count">{categoryCounts.all}</span>
                                                </button>
                                                {Object.entries(COMMENT_TYPES).map(([type, meta]) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        className={`cfd-cat ${category === type ? 'on' : ''}`}
                                                        onClick={() => setCategory(type)}
                                                    >
                                                        <i className={`bi ${meta.icon} me-2`}></i>{meta.label}
                                                        <span className="cfd-cat-count">{categoryCounts[type]}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {shownComments.length === 0 ? (
                                                <div className="cfd-empty big">
                                                    <i className="bi bi-chat-square-dots"></i>
                                                    No comments match these filters.
                                                </div>
                                            ) : (
                                                <div className="cfd-grid">
                                                    {shownComments.slice(0, visibleCount).map((c, index) => {
                                                        const meta = COMMENT_TYPES[c.type];
                                                        const r = c.response;
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={c.key}
                                                                className="cfd-comment"
                                                                style={{ animationDelay: `${(index % PAGE_SIZE) * 35}ms` }}
                                                                onClick={() => openResponse(r.id)}
                                                            >
                                                                <div className="cfd-person">
                                                                    <span className="cfd-avatar" style={{ background: avatarTone(r.name) }}>
                                                                        {initialsOf(r.name)}
                                                                    </span>
                                                                    <div className="min-w-0 flex-grow-1">
                                                                        <div className="cfd-person-name">{r.name}</div>
                                                                        <div className="cfd-person-sub">{r.designation} · {r.company}</div>
                                                                    </div>
                                                                    {r.isNew && <span className="cfd-new-dot" title="New"></span>}
                                                                </div>

                                                                <span className={`cfd-tag ${meta.tone}`}>
                                                                    <i className={`bi ${meta.icon} me-1`}></i>{meta.short}
                                                                </span>

                                                                <p className="cfd-quote">{c.text}</p>

                                                                <div className="cfd-comment-foot">
                                                                    <span className="cfd-date">
                                                                        <i className="bi bi-calendar3 me-1"></i>{formatDate(r.submittedOn)}
                                                                    </span>
                                                                    <span className="d-flex align-items-center gap-2">
                                                                        <Stars value={r.avg} />
                                                                        <span className="cfd-score">{r.avg.toFixed(1)}</span>
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {visibleCount < shownComments.length && (
                                                <div className="cfd-more">
                                                    <button
                                                        type="button"
                                                        className="cfd-btn-ghost"
                                                        onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                                                    >
                                                        Load more<i className="bi bi-chevron-down ms-2"></i>
                                                    </button>
                                                </div>
                                            )}

                                            {shownComments.length > 0 && (
                                                <div className="cfd-showing">
                                                    Showing {Math.min(visibleCount, shownComments.length)} of {shownComments.length} comments
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {tab === 'responses' && (
                                        <>
                                            <div className="table-responsive">
                                                <table className="cfd-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Customer</th>
                                                            <th>Submitted</th>
                                                            <th>Average</th>
                                                            <th>Comments</th>
                                                            <th>Reference</th>
                                                            <th className="text-end">View</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredResponses.slice(0, visibleCount).map((r) => {
                                                            const count = Object.values(r.comments).filter((v) => v?.trim()).length;
                                                            const hasIssue = Boolean(r.comments.issues?.trim());
                                                            return (
                                                                <tr key={r.id} onClick={() => openResponse(r.id)}>
                                                                    <td>
                                                                        <div className="cfd-person">
                                                                            <span className="cfd-avatar sm" style={{ background: avatarTone(r.name) }}>
                                                                                {initialsOf(r.name)}
                                                                            </span>
                                                                            <div className="min-w-0">
                                                                                <div className="cfd-person-name">
                                                                                    {r.name}
                                                                                    {r.isNew && <span className="cfd-new-dot inline"></span>}
                                                                                </div>
                                                                                <div className="cfd-person-sub">{r.designation} · {r.company}</div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-nowrap">{formatDate(r.submittedOn)}</td>
                                                                    <td>
                                                                        <span className="d-flex align-items-center gap-2 text-nowrap">
                                                                            <Stars value={r.avg} size={12} />
                                                                            <span className="cfd-score">{r.avg.toFixed(1)}</span>
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-nowrap">
                                                                        <span className="cfd-count-pill">{count}</span>
                                                                        {hasIssue && (
                                                                            <span className="cfd-tag red ms-2">
                                                                                <i className="bi bi-exclamation-triangle-fill me-1"></i>Issue
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td><span className="cfd-ref">{r.ref}</span></td>
                                                                    <td className="text-end">
                                                                        <span className="cfd-view-btn"><i className="bi bi-arrow-right"></i></span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {filteredResponses.length === 0 && (
                                                <div className="cfd-empty big">
                                                    <i className="bi bi-table"></i>
                                                    No responses match these filters.
                                                </div>
                                            )}

                                            {visibleCount < filteredResponses.length && (
                                                <div className="cfd-more">
                                                    <button
                                                        type="button"
                                                        className="cfd-btn-ghost"
                                                        onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                                                    >
                                                        Load more<i className="bi bi-chevron-down ms-2"></i>
                                                    </button>
                                                </div>
                                            )}

                                            {filteredResponses.length > 0 && (
                                                <div className="cfd-showing">
                                                    Showing {Math.min(visibleCount, filteredResponses.length)} of {filteredResponses.length} responses
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                            {/* ===== end .cfd ===== */}

                            {/* ================= COMING SOON ================= */}
                            {COMING_SOON && (
                                <>
                                    {/* Tint over the blurred dashboard (scrolls with it) */}
                                    <div className="cfd-soon-veil" aria-hidden="true"></div>

                                    {/* Card pinned to the screen — stays in view while scrolling */}
                                    <div className="cfd-soon" role="status">
                                        <div className="cfd-soon-card">
                                            <span className="cfd-soon-icon">
                                                <i className="bi bi-rocket-takeoff-fill"></i>
                                            </span>

                                            <span className="cfd-soon-badge">
                                                <span className="cfd-soon-pulse"></span>
                                                Coming soon
                                            </span>

                                            <h2>We’re building something great</h2>

                                            <p>
                                                The Customer Feedback dashboard is under development. Soon you’ll see every
                                                rating and comment your customers share, with trends, top issues and full
                                                responses, all in one place.
                                            </p>

                                            <div className="cfd-soon-progress">
                                                <span></span>
                                            </div>

                                            <small className="cfd-soon-note">
                                                <i className="bi bi-tools me-1"></i>In development. Thank you for your patience.
                                            </small>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {/* ===== end .cfd-soon-wrap ===== */}

                    </div>
                </div>
            </div>

            {/* ================= OFFCANVAS — one submitted form ================= */}

            {!COMING_SOON && (
                <>
                    <div className={`cfd-backdrop ${selected ? 'show' : ''}`} onClick={closePanel}></div>

                    <aside className={`cfd-panel ${selected ? 'show' : ''}`} aria-hidden={!selected}>
                        {selected && (
                            <>
                                <div className="cfd-panel-hero">
                                    <span className="cfd-panel-avatar">{initialsOf(selected.name)}</span>
                                    <div className="min-w-0 flex-grow-1">
                                        <h2>{selected.name}</h2>
                                        <p>{selected.designation} · {selected.company}</p>
                                    </div>
                                    <button type="button" className="cfd-panel-close" onClick={closePanel} aria-label="Close">
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                </div>

                                <div className="cfd-panel-summary">
                                    <div>
                                        <b>{selected.avg.toFixed(1)}</b>
                                        <span>Avg rating</span>
                                    </div>
                                    <div>
                                        <b>{formatDate(selected.submittedOn, false)}</b>
                                        <span>Submitted</span>
                                    </div>
                                    <div>
                                        <b>{selected.ref}</b>
                                        <span>Reference</span>
                                    </div>
                                </div>

                                <div className="cfd-panel-body">
                                    <div className="cfd-panel-section">Ratings</div>
                                    {PARAMETERS.map((name, i) => {
                                        const value = selected.ratings[i] || 0;
                                        return (
                                            <div className="cfd-panel-rating" key={name}>
                                                <span className="cfd-panel-rating-name">{name}</span>
                                                <span className="cfd-segs" title={`${value} · ${SCALE[value]?.label || ''}`}>
                                                    {[1, 2, 3, 4, 5].map((n) => (
                                                        <span
                                                            key={n}
                                                            className="cfd-seg"
                                                            style={{ background: n <= value ? SCALE[value].color : undefined }}
                                                        ></span>
                                                    ))}
                                                </span>
                                                <span className="cfd-panel-rating-value">{value}</span>
                                            </div>
                                        );
                                    })}

                                    <div className="cfd-panel-section spaced">Comments</div>
                                    {Object.entries(COMMENT_TYPES).filter(([type]) => selected.comments[type]?.trim()).length === 0 ? (
                                        <div className="cfd-empty">No comments were left.</div>
                                    ) : (
                                        Object.entries(COMMENT_TYPES)
                                            .filter(([type]) => selected.comments[type]?.trim())
                                            .map(([type, meta]) => (
                                                <div className={`cfd-panel-comment ${meta.tone}`} key={type}>
                                                    <div className="cfd-panel-q">
                                                        <i className={`bi ${meta.icon} me-2`}></i>{meta.question}
                                                    </div>
                                                    <p>{selected.comments[type]}</p>
                                                </div>
                                            ))
                                    )}

                                    <div className="cfd-panel-section spaced">Customer details</div>
                                    <div className="cfd-panel-details">
                                        <div><i className="bi bi-person"></i><span>Name</span><b>{selected.name}</b></div>
                                        <div><i className="bi bi-briefcase"></i><span>Designation</span><b>{selected.designation}</b></div>
                                        <div><i className="bi bi-buildings"></i><span>Company</span><b>{selected.company}</b></div>
                                        <div><i className="bi bi-envelope"></i><span>Email</span><b>{selected.email || '—'}</b></div>
                                        <div><i className="bi bi-telephone"></i><span>Phone</span><b>{selected.phone || '—'}</b></div>
                                        <div><i className="bi bi-calendar-check"></i><span>Submitted on</span><b>{formatDate(selected.submittedOn)}</b></div>
                                    </div>

                                    <div className="cfd-panel-confirm">
                                        <i className="bi bi-patch-check-fill me-2"></i>
                                        Confirmed by the customer as accurate and reflecting their honest experience.
                                    </div>
                                </div>

                                <div className="cfd-panel-foot">
                                    <button type="button" className="cfd-btn-ghost" onClick={closePanel}>Close</button>
                                    {selected.email && (
                                        <a
                                            className="cfd-btn-primary"
                                            href={`mailto:${selected.email}?subject=${encodeURIComponent(`Your feedback ${selected.ref}`)}`}
                                        >
                                            <i className="bi bi-envelope me-2"></i>Email customer
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </aside>
                </>
            )}

            <style>{styles}</style>
        </Base1>
    );
}

// =============================================================
// STYLES — all under .cfd / .cfd-* so nothing leaks into the portal
// =============================================================

const styles = `
.cfd, .cfd-panel, .cfd-soon {
    --cfd-ink: #0f172a;
    --cfd-ink-2: #334155;
    --cfd-muted: #64748b;
    --cfd-line: #e8ecf4;
    --cfd-brand: #4f46e5;
    --cfd-brand-2: #7c3aed;
    --cfd-shadow: 0 1px 2px rgba(15, 23, 42, .04), 0 12px 32px -14px rgba(30, 27, 75, .16);
    color: var(--cfd-ink);
}

/* =============================================================
   COMING SOON
   - .cfd is blurred + locked (filter sits on .cfd itself)
   - .cfd-soon-veil tints the blurred area and scrolls with it
   - .cfd-soon is position:fixed, so the card stays centred on screen
============================================================= */
.cfd-soon-wrap { position: relative; }

.cfd-soon-wrap.is-locked .cfd {
    filter: blur(8px) saturate(.8);
    -webkit-filter: blur(8px) saturate(.8);
    opacity: .6;
    pointer-events: none;
    user-select: none;
}

/* Animations inside the blurred area are wasted work — switch them off */
.cfd-soon-wrap.is-locked .cfd *,
.cfd-soon-wrap.is-locked .cfd {
    animation: none !important;
    transition: none !important;
}

.cfd-soon-veil {
    position: absolute; inset: -12px; z-index: 4;
    border-radius: 24px;
    background: linear-gradient(180deg, rgba(248, 250, 252, .35), rgba(248, 250, 252, .7));
}

.cfd-soon {
    position: fixed; inset: 0; z-index: 90;
    display: flex; align-items: center; justify-content: center;
    padding: 90px 16px 24px;          /* keeps the card clear of the top header */
    pointer-events: none;             /* header/menu stay clickable around the card */
}

.cfd-soon-card {
    pointer-events: auto;
    width: min(520px, 100%); text-align: center;
    padding: 40px 36px 32px; border-radius: 26px; background: #fff;
    border: 1px solid #e8ecf4;
    box-shadow: 0 30px 70px -25px rgba(30, 27, 75, .45), 0 2px 6px rgba(15, 23, 42, .05);
    animation: cfdRise .55s cubic-bezier(.2, .8, .2, 1) backwards;
}
.cfd-soon-icon {
    display: inline-grid; place-items: center; width: 76px; height: 76px; border-radius: 24px;
    font-size: 32px; color: #fff;
    background: linear-gradient(135deg, #312e81 0%, #4338ca 55%, #7c3aed 100%);
    box-shadow: 0 18px 34px -14px rgba(67, 56, 202, .75);
    animation: cfdFloat 3.2s ease-in-out infinite;
}
.cfd-soon-badge {
    display: flex; align-items: center; justify-content: center; gap: 8px; width: max-content;
    margin: 22px auto 14px; padding: 6px 14px; border-radius: 999px;
    background: #eef2ff; color: #4338ca; font-size: 12px; font-weight: 800;
    letter-spacing: .12em; text-transform: uppercase;
}
.cfd-soon-pulse { width: 8px; height: 8px; border-radius: 50%; background: #4f46e5; animation: cfdPulse 1.6s ease-out infinite; }
.cfd-soon-card h2 { margin: 0 0 10px; font-size: 26px; font-weight: 800; letter-spacing: -.02em; color: #0f172a; }
.cfd-soon-card p { margin: 0 auto 24px; max-width: 420px; font-size: 15px; line-height: 1.65; color: #475569; }
.cfd-soon-progress { position: relative; height: 8px; border-radius: 99px; background: #eef0f6; overflow: hidden; }
.cfd-soon-progress span {
    position: absolute; top: 0; bottom: 0; width: 40%; border-radius: 99px;
    background: linear-gradient(90deg, #4338ca, #7c3aed);
    animation: cfdSlide 1.8s ease-in-out infinite;
}
.cfd-soon-note { display: block; margin-top: 14px; font-size: 13px; color: #64748b; }

@keyframes cfdFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes cfdPulse { 0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, .5); } 100% { box-shadow: 0 0 0 10px rgba(79, 70, 229, 0); } }
@keyframes cfdSlide { 0% { left: -40%; } 100% { left: 100%; } }

.cfd-panel .min-w-0 { min-width: 0; }
.cfd-more { margin-top: 24px; text-align: center; }

.cfd .min-w-0 { min-width: 0; }

/* ----- Header ----- */
.cfd-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-bottom: 22px; }
.cfd-title { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -.02em; color: var(--cfd-ink); }
.cfd-sub { margin: 4px 0 0; color: var(--cfd-muted); font-size: 14px; }
.cfd-head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.cfd-search { position: relative; width: 300px; max-width: 100%; }
.cfd-search > i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
.cfd-search input {
    width: 100%; height: 44px; padding: 0 36px 0 40px; border-radius: 12px; border: 1px solid var(--cfd-line);
    background: #fff; font-size: 13.5px; color: var(--cfd-ink); outline: none; transition: border-color .2s, box-shadow .2s;
}
.cfd-search input:focus { border-color: #a5b4fc; box-shadow: 0 0 0 4px rgba(79, 70, 229, .1); }
.cfd-search-clear { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); border: 0; background: #f1f5f9; color: #64748b; width: 26px; height: 26px; border-radius: 8px; font-size: 11px; cursor: pointer; }

.cfd-select { position: relative; }
.cfd-select select {
    appearance: none; -webkit-appearance: none; height: 44px; padding: 0 38px 0 14px; border-radius: 12px; border: 1px solid var(--cfd-line);
    background: #fff; font-size: 13.5px; font-weight: 500; color: var(--cfd-ink-2); cursor: pointer; outline: none;
}
.cfd-select select:focus { border-color: #a5b4fc; }
.cfd-select > i { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--cfd-muted); pointer-events: none; }

.cfd-btn-primary {
    display: inline-flex; align-items: center; justify-content: center; height: 44px; padding: 0 20px; border: 0; border-radius: 12px;
    color: #fff !important; font-weight: 700; font-size: 14px; text-decoration: none; cursor: pointer;
    background: linear-gradient(135deg, var(--cfd-brand), var(--cfd-brand-2)); box-shadow: 0 12px 24px -10px rgba(79, 70, 229, .7);
    transition: transform .2s, box-shadow .2s;
}
.cfd-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 16px 28px -10px rgba(79, 70, 229, .8); }
.cfd-btn-ghost {
    display: inline-flex; align-items: center; justify-content: center; height: 42px; padding: 0 20px; border-radius: 12px;
    border: 1px solid var(--cfd-line); background: #fff; color: var(--cfd-ink-2); font-weight: 600; font-size: 14px; cursor: pointer; transition: .2s;
}
.cfd-btn-ghost:hover { border-color: #c7d2fe; color: var(--cfd-brand); }

/* ----- KPIs ----- */
.cfd-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; margin-bottom: 20px; }
.cfd-kpi {
    position: relative; overflow: hidden; padding: 22px 22px 20px; border-radius: 20px; background: #fff;
    border: 1px solid var(--cfd-line); box-shadow: var(--cfd-shadow); transition: transform .2s, box-shadow .2s;
    animation: cfdRise .5s cubic-bezier(.2, .8, .2, 1) backwards;
}
.cfd-kpi:nth-child(2) { animation-delay: .05s; }
.cfd-kpi:nth-child(3) { animation-delay: .1s; }
.cfd-kpi:nth-child(4) { animation-delay: .15s; }
.cfd-kpi:hover { transform: translateY(-2px); }
.cfd-kpi.hero { color: #fff; border: 0; background: linear-gradient(135deg, #312e81 0%, #4338ca 55%, #7c3aed 100%); box-shadow: 0 18px 36px -16px rgba(67, 56, 202, .7); }
.cfd-kpi.hero::after { content: ""; position: absolute; right: -40px; bottom: -60px; width: 180px; height: 180px; border-radius: 50%; background: rgba(255, 255, 255, .08); }
.cfd-kpi-icon { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; font-size: 19px; margin-bottom: 22px; background: rgba(255, 255, 255, .16); color: #fff; }
.cfd-kpi-icon.amber { background: #fff7e0; color: #f59e0b; }
.cfd-kpi-icon.green { background: #e7f8ef; color: #059669; }
.cfd-kpi-icon.red   { background: #ffeef0; color: #e11d48; }
.cfd-kpi-value { font-size: 34px; font-weight: 800; line-height: 1; letter-spacing: -.02em; color: inherit; }
.cfd-kpi-value small { font-size: 16px; font-weight: 600; color: var(--cfd-muted); margin-left: 2px; }
.cfd-kpi-label { margin-top: 6px; font-size: 13.5px; color: var(--cfd-muted); }
.cfd-kpi.hero .cfd-kpi-label { color: rgba(255, 255, 255, .8); }
.cfd-kpi-badge { position: absolute; top: 22px; right: 20px; padding: 4px 10px; border-radius: 999px; background: #fbbf24; color: #3b2a00; font-size: 11.5px; font-weight: 800; z-index: 1; }

/* ----- Cards ----- */
.cfd-card { background: #fff; border: 1px solid var(--cfd-line); border-radius: 20px; box-shadow: var(--cfd-shadow); padding: 24px; }
.cfd-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.cfd-card-head h3 { margin: 0; font-size: 17px; font-weight: 800; color: var(--cfd-ink); }
.cfd-card-head p { margin: 3px 0 0; font-size: 13px; color: var(--cfd-muted); }
.cfd-chip { flex: none; display: inline-flex; align-items: center; padding: 5px 11px; border-radius: 9px; background: #f8fafc; border: 1px solid var(--cfd-line); font-size: 12.5px; font-weight: 700; color: var(--cfd-ink-2); }
.cfd-empty { padding: 24px 0; text-align: center; color: var(--cfd-muted); font-size: 13.5px; }
.cfd-empty.big { padding: 48px 0; }
.cfd-empty.big i { display: block; font-size: 30px; color: #cbd5e1; margin-bottom: 8px; }

/* Average by parameter */
.cfd-params { display: flex; flex-direction: column; gap: 14px; }
.cfd-param { display: grid; grid-template-columns: minmax(150px, 1.1fr) 1.4fr 58px; align-items: center; gap: 16px; }
.cfd-param-name { font-size: 13.5px; font-weight: 500; color: var(--cfd-ink-2); }
.cfd-param-track { height: 10px; border-radius: 99px; background: #eef0f6; overflow: hidden; }
.cfd-param-fill { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #4338ca, #6366f1); animation: cfdGrow .9s cubic-bezier(.2, .8, .2, 1) backwards; transform-origin: left; }
.cfd-param-value { text-align: right; font-size: 13.5px; font-weight: 800; color: var(--cfd-ink); white-space: nowrap; }
.cfd-param-value.weak { color: #d97706; }

/* Rating mix */
.cfd-mix-bar { display: flex; height: 48px; border-radius: 10px; overflow: hidden; gap: 3px; margin-bottom: 18px; }
.cfd-mix-seg { display: grid; place-items: center; min-width: 6px; color: #fff; font-size: 12.5px; font-weight: 800; flex-basis: 0; animation: cfdGrow .9s cubic-bezier(.2, .8, .2, 1) backwards; transform-origin: left; }
.cfd-mix-list { display: flex; flex-direction: column; }
.cfd-mix-row { display: grid; grid-template-columns: 12px 1fr 50px 50px; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f4f9; font-size: 13.5px; }
.cfd-mix-row:last-child { border-bottom: 0; }
.cfd-mix-dot { width: 12px; height: 12px; border-radius: 4px; }
.cfd-mix-name { color: var(--cfd-ink-2); }
.cfd-mix-count { text-align: right; font-weight: 800; color: var(--cfd-ink); }
.cfd-mix-pct { text-align: right; color: var(--cfd-muted); }

/* ----- Comments / responses ----- */
.cfd-list-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
.cfd-tabs { display: inline-flex; padding: 5px; border-radius: 14px; background: #eef1f7; }
.cfd-tabs button { border: 0; background: transparent; padding: 9px 18px; border-radius: 10px; font-size: 14px; font-weight: 600; color: var(--cfd-muted); cursor: pointer; transition: .2s; }
.cfd-tabs button.on { background: #fff; color: var(--cfd-ink); box-shadow: 0 4px 12px -4px rgba(15, 23, 42, .18); }
.cfd-list-filters { display: flex; gap: 10px; flex-wrap: wrap; }

.cfd-cats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }
.cfd-cat { display: inline-flex; align-items: center; height: 40px; padding: 0 8px 0 14px; border-radius: 999px; border: 1px solid var(--cfd-line); background: #fff; color: var(--cfd-ink-2); font-size: 13.5px; font-weight: 600; cursor: pointer; transition: .2s; }
.cfd-cat:hover { border-color: #c7d2fe; }
.cfd-cat.on { background: #111827; border-color: #111827; color: #fff; }
.cfd-cat-count { margin-left: 8px; min-width: 26px; height: 24px; padding: 0 7px; border-radius: 999px; display: inline-grid; place-items: center; background: #f1f5f9; color: var(--cfd-muted); font-size: 11.5px; font-weight: 700; }
.cfd-cat.on .cfd-cat-count { background: rgba(255, 255, 255, .16); color: #fff; }

.cfd-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.cfd-comment {
    display: flex; flex-direction: column; align-items: stretch; min-width: 0; text-align: left; padding: 20px; border-radius: 18px;
    border: 1px solid var(--cfd-line); background: #fff; cursor: pointer; transition: transform .2s, box-shadow .2s, border-color .2s;
    animation: cfdRise .45s cubic-bezier(.2, .8, .2, 1) backwards;
}
.cfd-comment:hover { transform: translateY(-3px); border-color: #c7d2fe; box-shadow: 0 18px 32px -18px rgba(79, 70, 229, .45); }
.cfd-comment:focus-visible { outline: 2px solid var(--cfd-brand); outline-offset: 2px; }

.cfd-person { display: flex; align-items: center; gap: 12px; min-width: 0; }
.cfd-avatar { flex: none; width: 46px; height: 46px; border-radius: 13px; display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 15px; }
.cfd-avatar.sm { width: 38px; height: 38px; border-radius: 11px; font-size: 13px; }
.cfd-person-name { font-size: 15px; font-weight: 700; color: var(--cfd-ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cfd-person-sub { font-size: 12.5px; color: var(--cfd-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cfd-new-dot { flex: none; align-self: flex-start; width: 9px; height: 9px; border-radius: 50%; background: var(--cfd-brand); box-shadow: 0 0 0 4px rgba(79, 70, 229, .14); }
.cfd-new-dot.inline { display: inline-block; margin-left: 8px; vertical-align: middle; }

.cfd-tag { align-self: flex-start; display: inline-flex; align-items: center; margin: 16px 0 12px; padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: 700; }
td .cfd-tag { margin: 0; }
.cfd-tag.green  { background: #e9f8ef; color: #047857; }
.cfd-tag.purple { background: #f3edff; color: #6d28d9; }
.cfd-tag.red    { background: #ffeef0; color: #be123c; }
.cfd-tag.blue   { background: #e8f1ff; color: #1d4ed8; }

.cfd-quote { flex: 1 1 auto; margin: 0 0 16px; padding-left: 16px; border-left: 3px solid #e2e8f0; font-size: 14.5px; line-height: 1.6; color: var(--cfd-ink-2); display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.cfd-comment-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 14px; border-top: 1px dashed var(--cfd-line); }
.cfd-date { font-size: 12.5px; color: var(--cfd-muted); white-space: nowrap; }
.cfd-stars { color: #f5b301; letter-spacing: 1px; white-space: nowrap; }
.cfd-stars .bi-star { color: #d8dce8; }
.cfd-score { padding: 3px 9px; border-radius: 8px; background: #f1f5f9; font-size: 12.5px; font-weight: 800; color: var(--cfd-ink); }
.cfd-showing { margin-top: 22px; font-size: 13px; color: var(--cfd-muted); }

/* Responses table */
.cfd-table { width: 100%; border-collapse: separate; border-spacing: 0; min-width: 760px; }
.cfd-table th { padding: 12px 14px; background: #f7f9fc; color: var(--cfd-muted); font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; border-bottom: 1px solid var(--cfd-line); }
.cfd-table th:first-child { border-radius: 12px 0 0 12px; }
.cfd-table th:last-child  { border-radius: 0 12px 12px 0; }
.cfd-table td { padding: 14px; border-bottom: 1px solid #f1f4f9; font-size: 13.5px; color: var(--cfd-ink-2); vertical-align: middle; }
.cfd-table tbody tr { cursor: pointer; transition: background .15s; }
.cfd-table tbody tr:hover td { background: #f8f9ff; }
.cfd-count-pill { display: inline-grid; place-items: center; min-width: 26px; height: 24px; padding: 0 7px; border-radius: 8px; background: #eef2ff; color: var(--cfd-brand); font-size: 12px; font-weight: 800; }
.cfd-ref { padding: 3px 10px; border-radius: 8px; background: #f4f6fa; border: 1px solid var(--cfd-line); font-size: 12.5px; font-weight: 700; color: var(--cfd-ink-2); white-space: nowrap; }
.cfd-view-btn { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; border: 1px solid #e0e7ff; background: #eef2ff; color: var(--cfd-brand); transition: .2s; }
.cfd-table tbody tr:hover .cfd-view-btn { background: var(--cfd-brand); color: #fff; transform: translateX(2px); }

/* ----- Offcanvas ----- */
.cfd-backdrop { position: fixed; inset: 0; z-index: 1090; background: rgba(15, 23, 42, .45); backdrop-filter: blur(2px); opacity: 0; pointer-events: none; transition: opacity .3s; }
.cfd-backdrop.show { opacity: 1; pointer-events: auto; }
.cfd-panel {
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 1100; width: min(620px, 100%); display: flex; flex-direction: column;
    background: #f8f9fc; box-shadow: -24px 0 60px -20px rgba(15, 23, 42, .45);
    transform: translateX(105%); transition: transform .38s cubic-bezier(.2, .8, .2, 1); color: #0f172a;
}
.cfd-panel.show { transform: none; }
.cfd-panel-hero {
    flex: none; display: flex; align-items: center; gap: 16px; padding: 28px 30px 76px; color: #fff;
    background: linear-gradient(120deg, #312e81 0%, #4338ca 50%, #7c3aed 100%);
}
.cfd-panel-hero h2 { margin: 0; font-size: 24px; font-weight: 800; color: #fff; }
.cfd-panel-hero p { margin: 4px 0 0; color: rgba(255, 255, 255, .78); font-size: 14.5px; }
.cfd-panel-avatar { flex: none; width: 64px; height: 64px; border-radius: 18px; display: grid; place-items: center; font-size: 20px; font-weight: 800; color: #fff; background: rgba(255, 255, 255, .16); border: 1px solid rgba(255, 255, 255, .22); }
.cfd-panel-close { flex: none; align-self: flex-start; width: 40px; height: 40px; border-radius: 12px; border: 0; background: transparent; color: #fff; font-size: 20px; cursor: pointer; transition: background .2s, transform .2s; }
.cfd-panel-close:hover { background: rgba(255, 255, 255, .14); transform: rotate(90deg); }
.cfd-panel-summary {
    flex: none; position: relative; z-index: 1; margin: -52px 22px 0; padding: 22px 12px; border-radius: 20px; background: #fff;
    box-shadow: 0 18px 40px -18px rgba(30, 27, 75, .35); display: grid; grid-template-columns: repeat(3, 1fr); text-align: center;
}
.cfd-panel-summary b { display: block; font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -.01em; }
.cfd-panel-summary span { display: block; margin-top: 6px; font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #64748b; }
.cfd-panel-body { flex: 1 1 auto; overflow-y: auto; padding: 28px 30px 24px; }
.cfd-panel-section.spaced { margin-top: 30px; }
.cfd-panel-section { margin-bottom: 14px; font-size: 13px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #64748b; }
.cfd-panel-rating { display: grid; grid-template-columns: 1fr auto 26px; align-items: center; gap: 18px; padding: 9px 0; }
.cfd-panel-rating-name { font-size: 15px; color: #1e293b; }
.cfd-panel-rating-value { text-align: right; font-weight: 800; font-size: 15px; }
.cfd-segs { display: inline-flex; gap: 4px; }
.cfd-seg { width: 19px; height: 9px; border-radius: 3px; background: #e9ecf3; }
.cfd-panel-comment { margin-bottom: 12px; padding: 16px 18px; border-radius: 16px; background: #fff; border: 1px solid #e8ecf4; border-left: 4px solid #cbd5e1; }
.cfd-panel-comment.green  { border-left-color: #10b981; }
.cfd-panel-comment.purple { border-left-color: #8b5cf6; }
.cfd-panel-comment.red    { border-left-color: #f43f5e; }
.cfd-panel-comment.blue   { border-left-color: #3b82f6; }
.cfd-panel-q { font-size: 13.5px; font-weight: 700; color: #475569; }
.cfd-panel-comment p { margin: 8px 0 0; font-size: 15px; line-height: 1.6; color: #1e293b; }
.cfd-panel-details { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.cfd-panel-details > div { display: grid; grid-template-columns: 30px 1fr; grid-template-rows: auto auto; column-gap: 10px; padding: 12px 14px; border-radius: 14px; background: #fff; border: 1px solid #e8ecf4; min-width: 0; }
.cfd-panel-details i { grid-row: span 2; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: #eef2ff; color: #4f46e5; font-size: 14px; }
.cfd-panel-details span { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #94a3b8; }
.cfd-panel-details b { font-size: 13.5px; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cfd-panel-confirm { margin-top: 16px; padding: 12px 14px; border-radius: 12px; background: #ecfdf5; color: #047857; font-size: 13px; font-weight: 600; }
.cfd-panel-foot { flex: none; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 30px; background: #fff; border-top: 1px solid #e8ecf4; }

/* ----- Motion ----- */
@keyframes cfdRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes cfdGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* ----- Responsive ----- */
@media (max-width: 1199.98px) {
    .cfd-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cfd-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 767.98px) {
    .cfd-title { font-size: 23px; }
    .cfd-head-actions, .cfd-search { width: 100%; }
    .cfd-head-actions .cfd-select { flex: 1 1 auto; }
    .cfd-head-actions .cfd-select select { width: 100%; }
    .cfd-kpis { gap: 12px; }
    .cfd-kpi { padding: 18px; }
    .cfd-kpi-value { font-size: 28px; }
    .cfd-card { padding: 18px; }
    .cfd-grid { grid-template-columns: minmax(0, 1fr); }
    .cfd-param { grid-template-columns: 1fr 52px; gap: 6px 12px; }
    .cfd-param-track { grid-column: 1 / -1; grid-row: 2; }
    .cfd-panel-hero { padding: 22px 20px 70px; }
    .cfd-panel-summary { margin: -50px 14px 0; }
    .cfd-panel-summary b { font-size: 19px; }
    .cfd-panel-body { padding: 22px 20px; }
    .cfd-panel-details { grid-template-columns: 1fr; }
    .cfd-panel-foot { padding: 12px 20px; }

    .cfd-soon { padding: 80px 14px 16px; }
    .cfd-soon-card { padding: 30px 22px 26px; border-radius: 22px; }
    .cfd-soon-card h2 { font-size: 21px; }
    .cfd-soon-card p { font-size: 14px; }
}
@media (max-width: 479.98px) {
    .cfd-kpis { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
    .cfd *, .cfd-panel, .cfd-backdrop,
    .cfd-soon-card, .cfd-soon-icon, .cfd-soon-pulse, .cfd-soon-progress span { animation: none !important; transition: none !important; }
}
`;