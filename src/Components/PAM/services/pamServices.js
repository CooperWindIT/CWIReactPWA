import { fetchWithAuth } from "../../../utils/api";

const jsonHeaders = { "Content-Type": "application/json" };

/* ---------------- DDL ---------------- */

// GET ADMINRoutes/CWIGetDDLItems?OrgId=..&UserId=0  → returns only Departments
export const getDepartments = async (orgId) => {
    const cacheKey = "ddlDepartmentsData";
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);

    const response = await fetchWithAuth(`ADMINRoutes/CWIGetDDLItems?OrgId=${orgId}&UserId=0`, {
        method: "GET",
        headers: jsonHeaders,
    });

    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();
    const depts = (data?.ResultData || []).filter((item) => item.DDLName === "Departments");
    sessionStorage.setItem(cacheKey, JSON.stringify(depts));
    return depts;
};

/* ---------------- Jobs ---------------- */

// GET HRM/GetJobs?OrgId=8523&DeptId=0
export const getJobs = async (orgId, deptId = 0) => {
    const response = await fetchWithAuth(`HRM/GetJobs?OrgId=${orgId}&DeptId=${deptId}`, {
        method: "GET",
        headers: jsonHeaders,
    });

    if (!response.ok) throw new Error("Network response was not ok");

    return response.json();
};

// POST HRM/SaveCareerMaster (generic – all career master actions go through here)
export const saveCareerMaster = async (payload) => {
    const response = await fetchWithAuth("HRM/SaveCareerMaster", {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(payload),
    });

    return response.json();
};

// Add (JobId = 0) / Edit (JobId > 0)
export const saveJob = async ({ orgId, userId, job }) =>
    saveCareerMaster({
        OrgId: orgId,
        UserId: userId,
        Action: "SaveJob",
        JsonData: job,
    });

// Active / Inactive
export const toggleJobActive = async ({ orgId, userId, jobId, isActive }) =>
    saveCareerMaster({
        OrgId: orgId,
        UserId: userId,
        Action: "SaveJob",
        JsonData: { JobId: jobId, IsActive: isActive ? 1 : 0 },
    });

/* Adjust this once if your API uses a different success shape */
export const isApiSuccess = (res) =>
    !!res &&
    (res.Success === true ||
        res.success === true ||
        res.Status === 200 ||
        res.StatusCode === 200 ||
        String(res.Status).toLowerCase() === "success");