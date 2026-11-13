import { fetchWithAuth } from "../../../utils/api";

// Get Items with server-side pagination and filters
export const getItems = async ({
    orgId,
    pageNumber = 1,
    pageSize = 10,
    partNo = "",
    itemName = "",
    itemCode = ""
}) => {
    const response = await fetchWithAuth("IIM/GetItems", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ServiceName: "GetItems",
            PageNumber: pageNumber,
            PageSize: pageSize,
            Params: {
                OrgId: orgId,
                PartNo: partNo,
                ItemName: itemName,
                ItemCode: itemCode
            }
        })
    });

    if (!response.ok) {
        throw new Error("Failed to fetch items");
    }

    return response.json();
};

export const getInwards = async ({
    orgId,
    pageNumber = 1,
    pageSize = 10,
    fromDate,
    toDate,
    vehicleNumber = "",
    status = "ALL",
    isOutward = 0          // 0 = inwards, 1 = outwards
}) => {
    const response = await fetchWithAuth("IIM/GetInwards", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ServiceName: "GetInwards",
            PageNumber: pageNumber,
            PageSize: pageSize,
            Params: {
                OrgId: orgId,
                FromDate: fromDate,
                ToDate: toDate,
                VehicleNumber: vehicleNumber,
                Status: status,
                IsOutward: isOutward
            }
        })
    });

    if (!response.ok) {
        throw new Error("Failed to fetch inward records");
    }

    return response.json();
};


export const manageInwards = async (formData) => {

    const response = await fetchWithAuth(
        "file_upload/ManageInwards",
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        // use the server's message when it sends one; callers show their own (inward / outward) text otherwise
        let msg = "";
        try {
            const body = await response.json();
            msg = body?.response || body?.message || "";
        } catch { /* no JSON body */ }
        const err = new Error(msg || `Request failed (${response.status})`);
        err.serverMessage = msg;
        throw err;
    }

    return response.json();
};

export const getInwardRecordDetails = async (orgId, inwardRecordId) => {
    const params = new URLSearchParams({
        OrgId: orgId,
        InwardRecordId: inwardRecordId
    });

    const response = await fetchWithAuth(
        `IIM/GetInwardRecordDetails?${params.toString()}`,
        {
            method: "GET"
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch inward record details");
    }

    return response.json();
};

export const reviewInward = async (payload) => {
    const response = await fetchWithAuth("IIM/ManageInwards", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error("Failed to save inward review");
    }

    return response.json();
};

// Get inward records that contain a given item (for the barcode dropdown)
// GET IIM/GetInwardRecordsByItem?OrgId=8523&ItemId=10
export const getInwardRecordsByItem = async (orgId, itemId) => {
    const params = new URLSearchParams({
        OrgId: orgId,
        ItemId: itemId
    });

    const response = await fetchWithAuth(
        `IIM/GetInwardRecordsByItem?${params.toString()}`,
        {
            method: "GET"
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch inward records for item");
    }

    return response.json();
};

// Get barcode units (inventory units) for an inward record + item
// GET IIM/GetInventoryUnits?UnitStatus=ALL&InwardRecordId=1&GenerationFilter=ALL&ItemId=11
// generationFilter: "ALL" | "GENERATED" | "NOT_GENERATED"
export const getInventoryUnits = async ({
    unitStatus = "ALL",
    inwardRecordId = 0,
    generationFilter = "ALL",
    itemId = ""
} = {}) => {
    const params = new URLSearchParams({
        UnitStatus: unitStatus || "ALL",
        InwardRecordId: inwardRecordId ?? 0,
        GenerationFilter: generationFilter || "ALL"
    });

    // Send ItemId only when we have one (inward view loads all items)
    if (itemId !== undefined && itemId !== null && itemId !== "") {
        params.append("ItemId", itemId);
    }

    const response = await fetchWithAuth(
        `IIM/GetInventoryUnits?${params.toString()}`,
        {
            method: "GET"
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch inventory units");
    }

    return response.json();
};

// Approve inward into inventory + save generated barcodes
// POST IIM/ApproveToInventory
// { OrgId, InwardRecordId, Action: "UPDATE_INVENTORY", UserId, UnitsJson: [{ RecordItemId, Barcode }] }
export const approveInward = async (payload) => {
    const response = await fetchWithAuth("IIM/ApproveToInventory", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error("Failed to approve inward");
    }

    return response.json();
};


// Inwards of an item with barcode generation status
// GET IIM/GetInwardsbyItem?OrgId=8523&ItemId=11
// -> [{ InwardRecordId, InwardRecordNo, ArrivalDate, VerifiedQuantity, AlreadyGenerated, ToGenerate }]
export const getInwardsByItem = async (orgId, itemId) => {
    const params = new URLSearchParams({ OrgId: orgId, ItemId: itemId });

    const response = await fetchWithAuth(`IIM/GetInwardsbyItem?${params.toString()}`, {
        method: "GET"
    });

    if (!response.ok) {
        throw new Error("Failed to fetch inwards for item");
    }

    return response.json();
};

// Rework tab: units of all items (ItemId = 0) or one item
// GET IIM/GetItemsDDL?OrgId=8523&ItemId=0
export const getReworkUnits = async ({ orgId, itemId = 0 }) => {
    const params = new URLSearchParams({
        OrgId: orgId,
        ItemId: itemId || 0
    });

    // Rework list service (was IIM/GetInventoryUnits)
    const response = await fetchWithAuth(`IIM/GetItemsDDL?${params.toString()}`, {
        method: "GET"
    });

    if (!response.ok) {
        throw new Error("Failed to fetch rework units");
    }

    const res = await response.json();
    // accept data as an array or wrapped ({ result: [...] })
    if (res && !Array.isArray(res.data) && Array.isArray(res?.data?.result)) res.data = res.data.result;
    return res;
};

// GET iim/GetOutwardLoadedUnits?OrgId=&OutwardId=&ItemId=   (ItemId 0 = all items)
// -> data: [{ UnitId, RecordItemId, Barcode, UnitStatus, ItemId, ItemCode, ItemName }]
export const getOutwardLoadedUnits = async ({ orgId, outwardId, itemId = 0 }) => {
    const params = new URLSearchParams({
        OrgId: orgId,
        OutwardId: outwardId,
        ItemId: itemId || 0
    });

    const response = await fetchWithAuth(`iim/GetOutwardLoadedUnits?${params.toString()}`, {
        method: "GET"
    });

    if (!response.ok) {
        throw new Error("Failed to fetch loaded units");
    }

    return response.json();
};

// GET IIM/ItemsRegdownloadexcel -> Excel template (file) for bulk item upload
// Returns { blob, fileName }
export const downloadItemsExcel = async () => {
    const response = await fetchWithAuth("IIM/ItemsRegdownloadexcel", {
        method: "GET"
    });

    if (!response.ok) {
        throw new Error("Failed to download the Excel template");
    }

    // server may answer with JSON when something is wrong
    const type = response.headers.get("content-type") || "";
    if (type.includes("application/json")) {
        const body = await response.json();
        throw new Error(body?.response || body?.message || "Excel template not available");
    }

    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    const fileName = match ? decodeURIComponent(match[1]) : "Items_BulkUpload.xlsx";

    return { blob: await response.blob(), fileName };
};

// POST IIM/uploadItemsExcel (FormData: OrgId, UserId, Action = "ADD", file)
export const uploadItemsExcel = async ({ orgId, userId, file, action = "ADD" }) => {
    const formData = new FormData();
    formData.append("OrgId", orgId);
    formData.append("UserId", userId);
    formData.append("Action", action);
    formData.append("file", file);

    const response = await fetchWithAuth("IIM/uploadItemsExcel", {
        method: "POST",
        body: formData
    });

    let body = null;
    try { body = await response.json(); } catch { body = null; }

    if (!response.ok) {
        throw new Error(body?.response || body?.message || "Failed to upload the Excel file");
    }

    return body;
};

// POST file_upload/ManageItems (FormData)
//   OrgId, UserId, Action ("ADD" | "EDIT"),
//   ItemsJson { ItemId (edit), ItemCode, ItemName, Description, PartNO, ItemImage, IsActive },
//   ItemImage (new image file, optional), DeleteFile (previous image, only when it is replaced/removed)
export const manageItems = async (formData) => {
    const response = await fetchWithAuth("file_upload/ManageItems", {
        method: "POST",
        body: formData
    });

    let body = null;
    try { body = await response.json(); } catch { body = null; }

    if (!response.ok) {
        throw new Error(body?.response || body?.message || "Failed to save item");
    }

    return body;
};

// POST IIM/GetDashboardSummary { OrgId }
// -> data: { Summary, InventoryOverview, InwardPendingActions, OutwardPendingActions, RecentInwards, RecentOutwards }
export const getDashboardSummary = async (orgId) => {
    const response = await fetchWithAuth("IIM/GetDashboardSummary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ OrgId: Number(orgId) })
    });

    if (!response.ok) {
        throw new Error("Failed to load dashboard");
    }

    return response.json();
};

// GET IIM/GetBarcodeTraceabilityDetails?OrgId=&Barcode=
// -> data: { Barcode, ItemName, ItemCode, UnitStatus, ReworkData, InwardData, InspectionData, OutwardData, DispatchData }
export const getBarcodeTraceability = async ({ orgId, barcode }) => {
    const params = new URLSearchParams({ OrgId: orgId, Barcode: barcode });

    const response = await fetchWithAuth(`IIM/GetBarcodeTraceabilityDetails?${params.toString()}`, {
        method: "GET"
    });

    if (!response.ok) {
        throw new Error("Failed to load barcode details");
    }

    return response.json();
};

// ==========================================
// COMMENTS (outward conversation)
// ==========================================

// GET IIM/GetIOMcomments?Id=<OutwardId>&OrgId=<OrgId>
// -> data: [{ Id, CommentText, CommentedOn, CommentedBy, CommentedUser, CommentedByEmail }]
export const getComments = async ({ orgId, requestId }) => {
    const params = new URLSearchParams({ Id: String(Number(requestId) || 0) });
    if (orgId) params.append("OrgId", String(orgId));
    const response = await fetchWithAuth(`IIM/GetIOMcomments?${params.toString()}`, {
        method: "GET"
    });
    if (!response.ok) throw new Error("Failed to fetch comments");
    const res = await response.json();
    // accept data as an array or wrapped ({ result: [...] })
    if (res && !Array.isArray(res.data) && Array.isArray(res?.data?.result)) res.data = res.data.result;
    return res;
};

// POST Portal/AddNewComments
// { OrgId, Priority: 1, UserId, CommentType: "IOM",
//   JsonData: { CommentText, TablePrimaryId: <OutwardId>, ToEmails: "", CommentId: 0 } }
export const addComment = async ({ orgId, userId, tablePrimaryId, text, commentType = "IOM", priority = 1, toEmails = "" }) => {
    const response = await fetchWithAuth("Portal/AddNewComments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            OrgId: Number(orgId),
            Priority: priority,
            UserId: Number(userId),
            CommentType: commentType,
            JsonData: {
                CommentText: text,
                TablePrimaryId: Number(tablePrimaryId),
                ToEmails: toEmails,
                CommentId: 0
            }
        })
    });
    if (!response.ok) throw new Error("Failed to add comment");
    return response.json();
};

// ==========================================
// USERS (for "Notify" dropdowns)
// GET ADMINRoutes/CWIGetDDLItems?OrgId=&UserId=0 -> ResultData: [{ DDLName: "Users", ItemId, ItemValue, DisplayValue, DisplayValue2, ... }]
// Only DDLName "Users" is kept. Cached in sessionStorage until the session is cleared.
// ==========================================
const DDL_USERS_KEY = "iomDDLUsers";

export const getDDLUsers = async (orgId, { force = false } = {}) => {
    const cacheKey = `${DDL_USERS_KEY}_${orgId}`;
    if (!force) {
        try {
            const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
            if (Array.isArray(cached)) return cached;
        } catch { /* ignore broken cache */ }
    }

    const params = new URLSearchParams({ OrgId: String(orgId ?? ""), UserId: "0" });
    const response = await fetchWithAuth(`ADMINRoutes/CWIGetDDLItems?${params.toString()}`, { method: "GET" });
    if (!response.ok) throw new Error("Failed to load users");

    const res = await response.json();
    const rows = Array.isArray(res?.ResultData) ? res.ResultData : Array.isArray(res?.data) ? res.data : [];
    const users = rows
        .filter(r => String(r?.DDLName || "").toLowerCase() === "users")
        .map(r => ({
            Id: Number(r.ItemId),
            Name: r.ItemValue || "",
            Email: r.DisplayValue || "",
            Department: r.DisplayValue2 || "",
            Code: r.DisplayValue3 || ""
        }))
        .sort((a, b) => a.Name.localeCompare(b.Name));

    try { sessionStorage.setItem(cacheKey, JSON.stringify(users)); } catch { /* ignore */ }
    return users;
};