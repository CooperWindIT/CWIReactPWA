// Outward status -> label + badge class (shared by list and view)
export const STATUS_META = {
    NEW: { label: "New", cls: "ow-amber" },
    DRAFT: { label: "Draft", cls: "ow-grey" },
    PENDING_LOADING: { label: "Pending Loading", cls: "ow-amber" },
    PARTIALLY_LOADED: { label: "Partially Loaded", cls: "ow-orange" },
    LOADING_COMPLETED: { label: "Loading Completed", cls: "ow-blue" },
    PENDING_SECURITY: { label: "Pending Security", cls: "ow-violet" },
    DISPATCH_CONFIRMED: { label: "Dispatch Confirmed", cls: "ow-green" },
    DISPATCH_COMPLETED: { label: "Dispatch Completed", cls: "ow-green" },
    DISPATCHED: { label: "Dispatched", cls: "ow-green" },
    CANCELLED: { label: "Cancelled", cls: "ow-red" }
};

export const getStatusMeta = (status) => {
    const key = String(status || "").toUpperCase();
    return STATUS_META[key] || {
        label: key ? key.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "-",
        cls: "ow-grey"
    };
};