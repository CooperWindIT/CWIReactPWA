import { fetchWithAuth } from "../../../utils/api";

export const manageKPI = async (payload) => {
    const response = await fetchWithAuth("KPI/ManageKPIs", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return response.json();
};

export const getKPIs = async ({ orgId, deptId, kpiLevel }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetKPIs",
            JsonData: {
                DeptId: deptId,
                KPILevel: kpiLevel
            }
        })
    });

    return response.json();
};

export const getManagerKPIs = async ({ orgId, employeeId, periodId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetManagerKPIs",
            JsonData: {
                EmployeeId: employeeId,
                PeriodId: periodId
            }
        })
    });

    return response.json();
};

export const getUsersByMngrId = async ({ orgId, managerId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetUsersByManagerId",
            JsonData: {
                ManagerId: managerId,
            }
        })
    });

    return response.json();
};
export const getPerformancePeriods = async ({ orgId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetPerformancePeriods",
            JsonData: {}
        })
    });

    return response.json();
};

export const getKPIsByPeriod = async ({ orgId, employeeId, periodId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetKPIsByPeriod",
            JsonData: {
                EmployeeId: employeeId,
                PeriodId: periodId
            }
        })
    });

    return response.json();
};

export const saveEmployeeKPIs = async (payload) => {
    const response = await fetchWithAuth("KPI/SaveEmployeeKPIs", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return response.json();
};

export const saveReviewCycles = async (payload) => {
    const response = await fetchWithAuth("KPI/SaveReviewCycles", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return response.json();
};

export const getReviewCycles = async ({ orgId, periodId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetReviewCycles",
            JsonData: {
                PeriodId: periodId,
            }
        })
    });

    return response.json();
};

export const getCanEditKPIAllocation = async ({ orgId, periodId, employeeId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "CanEditKPIAllocation",
            JsonData: {
                PeriodId: periodId,
                EmployeeId: employeeId,
            }
        })
    });

    return response.json();
};

export const getKPIDashboardStats = async ({ orgId, periodId, userId }) => {

    const response = await fetchWithAuth("KPI/GetKPIDashboardStats", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            PeriodId: periodId,
            UserId: userId,
        })
    });

    return response.json();
};

export const getReviewCyclesByUser = async ({ orgId, periodId, employeeId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetReviewCyclesByUser",
            JsonData: {
                PeriodId: periodId,
                EmployeeId: employeeId,
            }
        })
    });

    return response.json();
};

export const getIsKPIsAvailable = async ({ orgId, periodId, employeeId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "IsKPIsAvailable",
            JsonData: {
                PeriodId: periodId,
                EmployeeId: employeeId,
            }
        })
    });

    return response.json();
};

export const getChildKPIs = async ({ orgId, deptId, parentId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetChildKPIs",
            JsonData: {
                DeptId: deptId,
                ParentId: parentId,
            }
        })
    });

    return response.json();
};

export const getCyclesScoreByUserId = async ({ orgId, cycleId, employeeId, periodId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetCyclesScoreByUserId",
            JsonData: {
                CycleId: cycleId,
                EmployeeId: employeeId,
                PeriodId: periodId
            }
        })
    });

    return response.json();
};

export const getDeptKPIs = async ({ orgId, periodId, deptId, employeeId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetDeptKPIs",
            JsonData: {
                PeriodId: periodId,
                DeptId: deptId,
                EmployeeId: employeeId,
            }
        })
    });

    return response.json();
};

export const SaveAssessments = async (payload) => {
    const response = await fetchWithAuth("KPI/SaveAssessments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return response.json();
};

export const updatePeriod = async (payload) => {
    const response = await fetchWithAuth("KPI/updatePeriod", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return response.json();
};

export const calculateFinalScore = async (payload) => {
    const response = await fetchWithAuth("KPI/calculateFinalScore", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return response.json();
};

export const saveAnnualScore = async (payload) => {
    const response = await fetchWithAuth("KPI/SaveAnnualScore", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    return response.json();
};

export const getIsCreateCyclesBtn = async ({ orgId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "IsCreateCyclesBtn",
            JsonData: {}
        })
    });

    return response.json();
};

export const getIsOpenbtnEnable = async ({ orgId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "IsOpenbtnEnable",
            JsonData: {}
        })
    });

    return response.json();
};

export const getIsPublishbtnEnable = async ({ orgId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "IsPublishbtnEnable",
            JsonData: {}
        })
    });

    return response.json();
};

export const addNewComments = async (payload) => {
    const response = await fetchWithAuth("Portal/AddNewComments", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return response.json();
};

export const editSystemSettings = async (payload) => {
    const response = await fetchWithAuth("Portal/EditSystemSettings", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
    return response.json();
};

export const getFeedBacks = async ({ orgId, id }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetFeedBacks",
            JsonData: {
                Id: id,
            }
        })
    });

    return response.json();
};

export const getCyclePendingActions = async ({ orgId, status }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "GetCyclePendingActions",
            JsonData: {
                Status: status,
            }
        })
    });

    return response.json();
};

export const getIsSelfBtnEnable = async ({ orgId }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "IsSelfBtnEnable",
            JsonData: {}
        })
    });

    return response.json();
};

export const getPendingCycleScores = async ({ orgId, id }) => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            OrgId: orgId,
            Action: "PendingCycleScores",
            JsonData: {
                Id: id,
            }
        })
    });

    return response.json();
};

export const getSystemSettings = async () => {

    const response = await fetchWithAuth("KPI/MasterAPI", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            Action: "GetSystemSettings",
            JsonData: { }
        })
    });

    return response.json();
};