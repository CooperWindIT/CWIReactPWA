import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import { capitalizeFirstLetter } from "../../../utils/capital";
import Swal from 'sweetalert2';
import { Dropdown, Menu, Select, Tooltip, message, Input, Skeleton, Modal, Progress, Button } from 'antd';
import { getKPIsByPeriod, getPerformancePeriods, getUsersByMngrId, getReviewCyclesByUser, SaveAssessments, getCyclesScoreByUserId, saveEmployeeKPIs, addNewComments, getFeedBacks, getDeptKPIs, getKPIs, getCanEditKPIAllocation } from '../services/kpiServices';
import { calculateKPI } from './../../../utils/kpiCalculator';

export default function EmployeeKpi() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [employeesData, setEmployeesData] = useState([]);
    const [kpiPeriodsData, setKPIPeriodsData] = useState([]);
    const [empKPIData, setEmpKPIData] = useState([]);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [reviewCycleData, setReviewCycleData] = useState([]);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const [totalWeightedScore, setTotalWeightedScore] = useState(0);
    const [editableKPIs, setEditableKPIs] = useState([]);
    const [reviewData, setReviewData] = useState([]);
    const [feedbackData, setFeedbackData] = useState([]);
    const [reviewStatus, setReviewStatus] = useState("Pending");
    const [selectedQuarter, setSelectedQuarter] = useState([]);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedbackModal, setFeedbackModal] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [expandedCards, setExpandedCards] = useState(new Set());
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [deptKPIs, setDeptKPIs] = useState([]);
    const [canEditKPI, setCanEditKPI] = useState(true);
    const [canEditMessage, setCanEditMessage] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(0);
    const [feedback, setFeedback] = useState("");
    const [orgKPIs, setOrgKPIs] = useState([]);
    const targetInputRef = useRef(null);

    const toggleCard = (id) => {
        setExpandedCards((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const SESSION_KEY = "kpi_review_filters";
    const savedFilters = JSON.parse(
        sessionStorage.getItem(SESSION_KEY) || "{}"
    );

    const [selectedEmployee, setSelectedEmployee] = useState(
        savedFilters.employeeId || ""
    );

    const [selectedPeriod, setSelectedPeriod] = useState(
        savedFilters.periodId || sessionUserData?.PeriodId
    );

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setSelectedPeriod(userData?.PeriodId);

            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString();
            setSessionModuleId(moduleId);
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            setMenuData(parsedMenu)
            // Find Dashboard and Visitors menus
            const dashboardMenu = parsedMenu.find(
                (item) => item.MenuName === "KPI Master"
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

    useEffect(() => {
        if (editModalOpen) {
            setTimeout(() => {
                targetInputRef.current?.focus();
            }, 100);
        }
    }, [editModalOpen]);

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

    const fetchUsersByMngrId = async () => {
        try {
            setLoading(true);

            const sessionKey = `employees_${sessionUserData?.OrgId}_${sessionUserData?.Id}`;

            // Check session storage first
            const storedEmployees = sessionStorage.getItem(sessionKey);

            if (storedEmployees) {
                setEmployeesData(JSON.parse(storedEmployees));
                return;
            }

            // Fetch from API if not available
            const response = await getUsersByMngrId({
                orgId: sessionUserData?.OrgId,
                managerId: sessionUserData?.Id
            });

            const employees = response?.data || [];

            // Save to session storage
            sessionStorage.setItem(sessionKey, JSON.stringify(employees));

            // Update state
            setEmployeesData(employees);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPerformancePeriods = async () => {
        try {
            setLoading(true);

            const sessionKey = `performancePeriods_${sessionUserData?.OrgId}`;

            // Check session storage first
            const storedPeriods = sessionStorage.getItem(sessionKey);

            if (storedPeriods) {
                setKPIPeriodsData(JSON.parse(storedPeriods));
                return;
            }

            // Fetch from API if not available
            const response = await getPerformancePeriods({
                orgId: sessionUserData?.OrgId,
            });

            const periods = response?.data || [];

            // Save to session storage
            sessionStorage.setItem(sessionKey, JSON.stringify(periods));

            // Update state
            setKPIPeriodsData(periods);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchKPIsByPeriod = async () => {
        try {
            setLoading(true);

            const response = await getKPIsByPeriod({
                orgId: sessionUserData?.OrgId,
                employeeId: selectedEmployee,
                periodId: selectedPeriod,
            });

            setEmpKPIData(response?.data || []);
            // setEditableKPIs(response?.data);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReviewCycles = async () => {
        try {
            setLoading(true);

            const response = await getReviewCyclesByUser({
                orgId: sessionUserData?.OrgId,
                periodId: selectedPeriod,
                employeeId: selectedEmployee,
            });

            setReviewCycleData(response?.data || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDeptKPIs = async () => {
        try {
            setLoading(true);
            const response = await getDeptKPIs({
                orgId: sessionUserData?.OrgId,
                periodId: sessionUserData?.PeriodId,
                deptId: sessionUserData?.DeptId,
                employeeId: sessionUserData?.Id,
            });

            setDeptKPIs(response?.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCanEditKPIAllocation = async () => {
        try {
            const response = await getCanEditKPIAllocation({
                orgId: sessionUserData?.OrgId,
                periodId: sessionUserData?.PeriodId,
                employeeId: selectedEmployee,
            });

            setCanEditKPI(response?.data[0]?.Status);
            setCanEditMessage(response?.data[0]?.Message);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchUsersByMngrId();
            fetchPerformancePeriods();
        }
    }, [sessionUserData?.OrgId]);

    const fetchCyclesScoreByUserId = async () => {
        try {
            setLoading(true);

            const response = await getCyclesScoreByUserId({
                orgId: sessionUserData?.OrgId,
                cycleId: selectedQuarter?.Id,
                employeeId: selectedEmployee,
                periodId: selectedPeriod,
            });

            setReviewData(response?.data || []);
            setReviewStatus(response?.data[0]?.Status || "Pending");
            const { updatedData, total } = recalculateScores(response?.data || []);

            setReviewData(updatedData);
            setEditableKPIs(updatedData);
            setTotalWeightedScore(total);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFeedBacks = async () => {
        try {

            const response = await getFeedBacks({
                orgId: sessionUserData?.OrgId,
                id: selectedFeedback?.Id,
            });

            setFeedbackData(response?.data || []);

        } catch (error) {
            console.error(error);
        }
    };

    const fetchKPIList = async () => {
        try {
            const response = await getKPIs({
                orgId: sessionUserData?.OrgId,
                deptId: 0,
                kpiLevel: 1,
            });

            setOrgKPIs(response?.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (selectedFeedback?.Id && sessionUserData?.OrgId) {
            fetchFeedBacks();
        }
    }, [selectedFeedback, sessionUserData?.OrgId]);

    useEffect(() => {
        if (selectedQuarter && sessionUserData?.OrgId && selectedPeriod) {
            fetchCyclesScoreByUserId();
        }
    }, [selectedQuarter, sessionUserData?.OrgId, selectedPeriod]);

    useEffect(() => {
        if (reviewCycleData?.length > 0) {
            setSelectedQuarter(reviewCycleData[0]);
        }
    }, [reviewCycleData]);

    const recalculateScores = (data) => {

        const updatedData = data.map(item => {

            const actual = Number(
                sessionUserData?.RoleId === 3
                    ? item.Score1
                    : item.Score2
            );

            const { calculatedScore, weightedScore } = calculateKPI({
                FormulaId: item.FormulaId,
                Target: item.Target,
                Actual: actual,
                Weightage: item.Weightage
            });

            return {
                ...item,
                CalculatedScore: calculatedScore,
                WeightedScore: weightedScore
            };
        });

        const total = updatedData.reduce(
            (sum, item) => sum + Number(item.WeightedScore || 0),
            0
        );

        return {
            updatedData,
            total
        };
    };

    useEffect(() => {
        if (selectedEmployee && selectedPeriod && sessionUserData?.OrgId) {
            fetchKPIsByPeriod();
            fetchReviewCycles();
        } else {
            setEmpKPIData([]);
        }

        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
                employeeId: selectedEmployee,
                periodId: selectedPeriod
            })
        );
    }, [selectedEmployee, selectedPeriod, sessionUserData?.OrgId]);

    useEffect(() => {
        if (selectedPeriod && sessionUserData?.OrgId) {
            fetchReviewCycles();
            fetchDeptKPIs();
            fetchKPIList();
        } else {
            setReviewCycleData([]);
        }
    }, [selectedPeriod, sessionUserData?.OrgId]);

    useEffect(() => {
        if (!selectedEmployee || employeesData.length === 0) return;

        const employee = employeesData.find(
            emp => emp.Id === selectedEmployee
        );

        setSelectedEmployeeName(employee?.Name || "");

    }, [selectedEmployee, employeesData]);

    // const handleAnnualScore = async () => {

    //     const payload = {
    //         OrgId: sessionUserData.OrgId,
    //         UserId: sessionUserData.Id,
    //         PeriodId: Number(selectedPeriod),
    //         AnnualScore: 90.75,
    //         ReviewCount: 4,
    //         FinalRating: "Excellent",
    //         CreatedBy: sessionUserData.Id,
    //         UpdatedBy: sessionUserData.Id
    //     };

    //     try {
    //         setLoading(true);
    //         const response = await saveAnnualScore(payload);
    //         if (response?.success) {
    //             message.success("Annual score generated successfully.");
    //         } else {
    //             message.error(response?.message || "Failed to generate annual score.");
    //         }

    //     } catch (error) {
    //         console.error(error);
    //         message.error("Something went wrong.");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const handleAddKPIs = (selectedIds) => {
        const sourceKPIs =
            employeesData?.[0]?.RoleId === 5
                ? orgKPIs
                : deptKPIs;

        const newKPIs = sourceKPIs
            .filter(
                (kpi) =>
                    selectedIds.includes(kpi.Id) &&
                    !empKPIData.some((x) => x.KPIId === kpi.Id)
            )
            .map((kpi) => ({
                Id: 0,
                KPIId: kpi.Id,
                KPIName: kpi.KPIName,
                Objectives: kpi.Objectives,
                UOMName: kpi.UOMName,
                Target: "",
                Weightage: "",
                IsActive: 1,
                IsNew: true,
            }));

        setEmpKPIData((prev) => [...prev, ...newKPIs]);
    };

    const handleSaveReview = async () => {
        // Validation
        for (const item of reviewData) {
            if (sessionUserData?.RoleId !== 3) {
                if (
                    item.Score2 === null ||
                    item.Score2 === "" ||
                    item.Score2 === undefined
                ) {
                    message.warning(`${item.KPIName}: Please enter Manager Score.`);
                    return;
                }
                if (!item.Remarks2?.trim()) {
                    message.warning(`${item.KPIName}: Please enter Manager Remarks.`);
                    return;
                }
            } else {
                if (
                    item.Score1 === null ||
                    item.Score1 === "" ||
                    item.Score1 === undefined
                ) {
                    message.warning(`${item.KPIName}: Please enter Self Score.`);
                    return;
                }
                if (!item.Remarks1?.trim()) {
                    message.warning(`${item.KPIName}: Please enter Self Remarks.`);
                    return;
                }
            }
        }

        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Action: "MANAGER",
            JsonData: {
                CycleScore: {
                    EmployeeId: selectedEmployee,
                    ReviewCycleId: selectedQuarter?.Id,
                    CycleScore: totalWeightedScore
                },
                Assessments: reviewData.map(item => ({
                    Id: item.Id,
                    Score2: Number(item.Score2),
                    Remarks2: item.Remarks2 || "",
                    CalculatedScore: Number(item.CalculatedScore),
                    WeightedScore: item.WeightedScore || "",
                    Status: "EVALUATED",
                    Weightage: item.Weightage,
                }))
            }
        };

        try {
            setLoading(true);
            const response = await SaveAssessments(payload);
            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                message.success(
                    response.data.result[0].Message
                );
                fetchCyclesScoreByUserId();
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message ||
                    "Failed to save review."
                );
            }
        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }

    };

    const handleSubmitReview = async () => {
        // Validation
        for (const item of reviewData) {
            if (sessionUserData?.RoleId !== 3) {
                if (
                    item.Score2 === null ||
                    item.Score2 === "" ||
                    item.Score2 === undefined
                ) {
                    message.warning(`${item.KPIName}: Please enter Manager Score.`);
                    return;
                }
                if (!item.Remarks2?.trim()) {
                    message.warning(`${item.KPIName}: Please enter Manager Remarks.`);
                    return;
                }
            } else {
                if (
                    item.Score1 === null ||
                    item.Score1 === "" ||
                    item.Score1 === undefined
                ) {
                    message.warning(`${item.KPIName}: Please enter Self Score.`);
                    return;
                }
                if (!item.Remarks1?.trim()) {
                    message.warning(`${item.KPIName}: Please enter Self Remarks.`);
                    return;
                }
            }
        }

        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Action: "MANAGER",
            JsonData: {
                CycleScore: {
                    EmployeeId: selectedEmployee,
                    ReviewCycleId: selectedQuarter?.Id,
                    CycleScore: totalWeightedScore

                },
                Assessments: reviewData.map(item => ({
                    Id: item.Id,
                    CalculatedScore: Number(item.CalculatedScore),
                    WeightedScore: item.WeightedScore || "",
                    Status: "SUBMITTED",
                    Score2: Number(item.Score2),
                    Remarks2: item.Remarks2 || "",
                    Weightage: item.Weightage,
                }))
            }
        };

        try {
            setLoading(true);
            const response = await SaveAssessments(payload);
            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                message.success(
                    response.data.result[0].Message
                );
                fetchCyclesScoreByUserId();
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message ||
                    "Failed to save review."
                );
            }
        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }

    };

    const handleInputChange = (index, field, value) => {

        const updated = [...reviewData];

        updated[index][field] = value;

        const { updatedData, total } = recalculateScores(updated);

        setReviewData(updatedData);
        setEditableKPIs(updatedData);
        setTotalWeightedScore(total);

    };

    const getStatusClass = (status) => {
        switch (status?.toUpperCase()) {
            case "OPEN":
                return {
                    badge: "bg-light-success text-success",
                    icon: "text-success",
                };
            case "DRAFT":
                return {
                    badge: "bg-light-warning text-warning",
                    icon: "text-warning",
                };
            case "SUBMITTED":
                return {
                    badge: "bg-light-info text-info",
                    icon: "text-info",
                };
            case "COMPLETED":
            case "CLOSED":
                return {
                    badge: "bg-light-primary text-primary",
                    icon: "text-primary",
                };
            default:
                return {
                    badge: "bg-light-danger text-danger",
                    icon: "text-danger",
                };
        }
    };

    const updateField = (index, field, value) => {

        const newValue = Number(value) || 0;

        setEmpKPIData(prev => {

            const updated = [...prev];

            // Target Validation (Individual)
            if (field === "Target") {
                if (newValue > 100) {
                    message.warning("Target cannot be greater than 100.");
                    return prev;
                }

                updated[index].Target = newValue;
            }

            // Weightage Validation (Total)
            if (field === "Weightage") {
                const totalWeightage = updated.reduce((sum, item, i) => {
                    if (item.IsActive === 0) return sum;

                    return sum + (i === index ? newValue : Number(item.Weightage || 0));
                }, 0);

                if (totalWeightage > 100) {
                    message.warning("Total Weightage cannot exceed 100%.");
                    return prev;
                }
                updated[index].Weightage = newValue;
            }
            return updated;
        });
    };
    
    const handleUpdateAll = async () => {

        const activeKPIs = empKPIData.filter(item => item.IsActive === 1);

        // Individual Target Validation
        for (const item of activeKPIs) {

            if (Number(item.Target) > 100) {
                message.warning(
                    `${item.KPIName}: Target cannot be greater than 100.`
                );
                return;
            }

        }

        // Total Weightage Validation
        const totalWeightage = activeKPIs.reduce(
            (sum, item) => sum + Number(item.Weightage || 0),
            0
        );

        if (totalWeightage !== 100) {
            message.warning(
                `Total Weightage should be exactly 100%. Current: ${totalWeightage}%`
            );
            return;
        }

        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Type: "EDIT",
            JsonData: {
                Mappings: empKPIData.map((item) => {
                    const mapping = {
                        Id: item.Id,
                        TargetValue: Number(item.Target),
                        Weightage: Number(item.Weightage),
                        IsActive: item.IsActive,
                    };

                    // Include extra fields only for newly added KPIs
                    if (item.Id === 0) {
                        mapping.PeriodId = Number(selectedPeriod);   // Your selected period
                        mapping.KPIId = item.KPIId;
                        mapping.EmployeeId = Number(selectedEmployee); // Selected employee
                    }

                    return mapping;
                }),
            },
        };

        try {

            setSaving(true);

            const response = await saveEmployeeKPIs(payload);

            if (response?.success) {
                message.success("KPIs updated successfully.");
                fetchKPIsByPeriod();
                fetchCyclesScoreByUserId();
            } else {
                message.error(response?.message);
            }

        } finally {
            setSaving(false);
        }
    };

    const handleSaveFeedback = async () => {
        if (!feedback?.trim()) {
            message.warning("Please enter feedback.");
            return;
        }
        console.log(selectedFeedback)

        if (!selectedFeedback?.Id) {
            message.error("KPI details not found.");
            return;
        }

        try {
            setFeedbackLoading(true);

            const payload = {
                OrgId: sessionUserData?.OrgId,
                Priority: 1,
                UserId: sessionUserData?.Id,
                CommentType: "KPI",
                JsonData: {
                    CommentText: feedback.trim(),
                    TablePrimaryId: selectedFeedback?.Id,
                    EmployeeKPIId: selectedFeedback?.EmployeeKPIId,
                    CycleId: selectedQuarter?.Id,
                    CommentId: editingCommentId || 0,
                },
            };

            const response = await addNewComments(payload);

            const result = response?.data?.result?.[0];

            if (response?.success && result?.ResponseCode === 2002) {
                message.success("Feedback added successfully.");

                setFeedback("");
                fetchFeedBacks();
            } else {
                message.error(
                    response?.message || "Failed to add feedback."
                );
            }
        } catch (error) {
            console.error("Feedback submission error:", error);
            message.error("Something went wrong while saving feedback.");
        } finally {
            setFeedbackLoading(false);
        }
    };

    // const showEdit = sessionActionIds?.includes(3);
    const canEdit = ["Pending", "UNDER_REVIEW", "EVALUATED"].includes(reviewStatus);
    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];
    const allocatedKpiIds = empKPIData?.map(item => item.KPIId) || [];


    const kpiList =
        employeesData?.[0]?.RoleId === 5
            ? orgKPIs
            : deptKPIs;

    const availableKPIs = kpiList?.filter(
        kpi => !allocatedKpiIds.includes(kpi.Id)
    );

    const firstStatus = reviewCycleData?.[0]?.Status;

    const isAllCyclesDraft =
        reviewCycleData.length > 0 &&
        reviewCycleData.every(cycle => cycle.Status === "DRAFT");

    useEffect(() => {
        if (
            firstStatus &&
            firstStatus !== "DRAFT" &&
            sessionUserData?.OrgId &&
            sessionUserData?.Id &&
            sessionUserData?.PeriodId
        ) {
            fetchCanEditKPIAllocation();
        }
    }, [
        firstStatus,
        sessionUserData?.OrgId,
        sessionUserData?.Id,
        sessionUserData?.PeriodId,
    ]);



    return (
        <Base1>
            <div className="d-flex flex-column flex-column-fluid mb-12">
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className="page-title d-md-block d-none">
                            <div className="d-flex align-items-center gap-2">
                                <div className="dropdown d-inline-block me-2">
                                    <span
                                        className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                        role="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                        style={{ position: "relative", zIndex: 10 }}
                                    >
                                        <span className="menu-title">
                                            <i className="fa-solid fa-grip me-1"></i> Portal
                                        </span>
                                    </span>

                                    <ul className="dropdown-menu shadow">
                                        {modules.map((mod, index) => {
                                            const isActive = location.pathname
                                                .toLowerCase()
                                                .includes(mod.ModuleName.toLowerCase());

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
                                            <a
                                                href={`https://betasuperportal.cooperwind.online/`}
                                                target="_blank"
                                            >
                                                <li className="dropdown-item d-flex align-items-center gap-2 module-item">
                                                    <i
                                                        className={`fa-solid fa-user-tie`}
                                                        style={{
                                                            color: "#c8e6c9",
                                                            textShadow: "1px 1px 3px rgba(0, 0, 0, 0.5)",
                                                        }}
                                                    ></i>
                                                    <span>Super Portal</span>
                                                </li>
                                            </a>
                                        )}
                                        <li
                                            className="dropdown-item d-flex align-items-center gap-2 module-item"
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
                                <div className="d-flex align-items-center">
                                    {menuData?.map((menu) => {
                                        const hasSubItems = menu.SubItems && menu.SubItems.length > 0;

                                        if (hasSubItems) {
                                            const subMenu = (
                                                <Menu className="shadow-sm border-0 rounded-3 mt-2">
                                                    {menu.SubItems.map((sub) => (
                                                        <Menu.Item key={sub.AppMenuId} className="p-3">
                                                            <a
                                                                href={sub.MenuPath.startsWith('/') ? sub.MenuPath : `/${sub.MenuPath}`}
                                                                className="text-gray-700 fw-bold text-decoration-none"
                                                            >
                                                                <i className="bi bi-arrow-return-right me-1"></i>
                                                                {sub.MenuName}
                                                            </a>
                                                        </Menu.Item>
                                                    ))}
                                                </Menu>
                                            );

                                            return (
                                                <Dropdown overlay={subMenu} trigger={['hover']} key={menu.AppMenuId}>
                                                    <span className="menu-link bg-white shadow-sm me-2 cursor-pointer border border-gray-100">
                                                        <span className="menu-title">
                                                            <i className={`${menu.IconName || 'bi bi-grid'} text-primary me-2`}></i>
                                                            {menu.MenuName}
                                                        </span>
                                                        <i className="bi bi-chevron-down ms-2 fs-9"></i>
                                                    </span>
                                                </Dropdown>
                                            );
                                        }
                                        return (
                                            <a
                                                key={menu.AppMenuId}
                                                href={menu.MenuPath}
                                                style={{ position: "relative", zIndex: 10, textDecoration: 'none' }}
                                            >
                                                <span className={`menu-link bg-white shadow-sm me-2 cursor-pointer ${window.location.pathname === menu.MenuPath ? 'active border-primary' : ''}`}>
                                                    <span className="menu-title text-gray-800">
                                                        <i className={`${menu.IconName} text-primary me-2`}></i>
                                                        {menu.MenuName}
                                                    </span>
                                                </span>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="page-title d-md-none d-block mb-3 mb-md-0">
                            <div className="d-flex align-items-center gap-2">
                                <div className="dropdown d-inline-block">
                                    <span
                                        className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                        role="button"
                                        data-bs-toggle="dropdown"
                                        aria-expanded="false"
                                        style={{ position: "relative", zIndex: 10 }}
                                    >
                                        <span className="menu-title">
                                            <i className="fa-solid fa-grip me-1"></i>
                                        </span>
                                    </span>

                                    <ul className="dropdown-menu shadow">
                                        {modules?.map((mod, index) => {
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
                                            <a href={`https://betasuperportal.cooperwind.online/`} target="_blank">
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
                        </div>

                        <div className="d-flex align-items-center py-3 mb-2 d-none d-md-block">
                            <div className="welcome-animation">
                                <h2 className="mb-0">
                                    <span className="text-dark fw-light">Welcome, </span>
                                    <span className="animated-gradient-text">
                                        {sessionUserData?.Name || "Guest"}
                                    </span>
                                    <span className="ms-2">👋</span>
                                </h2>
                                <div
                                    className="mt-1"
                                    style={{
                                        height: '3px',
                                        width: '60px',
                                        background: '#0d6efd',
                                        borderRadius: '10px',
                                        opacity: '0.6'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="kt_app_content" className="app-content flex-column-fluid" style={{ marginTop: "-30px" }}>
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        {/* Employee Selection */}
                        <div className="card border-0 shadow-sm rounded-4 mb-5">
                            <div className="card-header bg-white border-0 pt-4 pb-2">
                                <div className="row align-items-center w-100">
                                    <div className="col-lg-8">
                                        <h3 className="fw-bold mb-1 d-flex align-items-center">
                                            <i className="bi bi-people-fill text-primary me-2 fs-3"></i>
                                            Employee KPI Management
                                        </h3>
                                        <p className="text-muted mb-0">
                                            Select an employee and performance period to view or manage KPI allocations.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="card-body pt-3">
                                <div className="row g-4">
                                    <div className="col-lg-5">
                                        <label className="form-label fw-bold">
                                            <i className="bi bi-person-workspace text-primary me-2"></i>
                                            Employee
                                        </label>
                                        <Select
                                            showSearch
                                            size="large"
                                            placeholder="Select Employee"
                                            value={selectedEmployee || undefined}
                                            style={{ width: "100%" }}
                                            optionFilterProp="children"
                                            onChange={(value) => setSelectedEmployee(value)}
                                        >
                                            {employeesData?.map(emp => (
                                                <Select.Option
                                                    key={emp.Id}
                                                    value={emp.Id}
                                                >
                                                    {emp.Name}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="col-lg-5">
                                        <label className="form-label fw-bold">
                                            <i className="bi bi-calendar3 text-success me-2"></i>
                                            Performance Period
                                        </label>
                                        <Select
                                            showSearch
                                            size="large"
                                            placeholder="Select Performance Period"
                                            value={selectedPeriod || undefined}
                                            style={{ width: "100%" }}
                                            optionFilterProp="children"
                                            onChange={(value) => setSelectedPeriod(value)}
                                        >
                                            {kpiPeriodsData?.map(period => (
                                                <Select.Option
                                                    key={period.Id}
                                                    value={period.Id}
                                                >
                                                    {period.PeriodName}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Review Cycles */}
                        <div className='row my-5'>
                            {(selectedPeriod && selectedEmployee) && (
                                <div className='col-12'>
                                    <div className="card border-0 shadow-sm rounded-4 mb-4">
                                        <div className="card-header bg-white border-0 px-4 py-3">
                                            <div className="d-flex justify-content-between align-items-center w-100">

                                                <div>
                                                    <h5 className="fw-bold mb-1">
                                                        <i className="bi bi-calendar2-week text-primary me-2"></i>
                                                        Review Cycles
                                                    </h5>
                                                    <small className="text-muted">
                                                        Select a quarter to continue
                                                    </small>
                                                </div>

                                                <Tooltip
                                                    title={canEditMessage}
                                                >
                                                    <span>
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => setEditModalOpen(true)}
                                                            disabled={!canEditKPI}
                                                        >
                                                            <i className="bi bi-pencil-square me-2"></i>
                                                            Edit Allocation
                                                        </button>
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        </div>

                                        <div className="card-body pt-3">
                                            <div className="row g-3">
                                                {reviewCycleData?.map((quarter, index) => (
                                                    <div className="col-lg-3 col-md-6 col-12" key={quarter.Id}>
                                                        <div
                                                            className={`review-quarter-card
                                                                ${selectedQuarter?.Id === quarter.Id ? "active-quarter" : ""}
                                                                ${quarter.Status === "DRAFT" ? "quarter-disabled" : ""}
                                                            `}
                                                            onClick={() => {
                                                                if (quarter.Status === "DRAFT") return;
                                                                setSelectedQuarter(quarter);
                                                            }}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-start">
                                                                <div className="d-flex">
                                                                    <div className="quarter-icon">
                                                                        <i className="bi bi-calendar2-week fs-5"></i>
                                                                    </div>
                                                                    <div className="ms-3">
                                                                        <div className="fw-bold fs-5">
                                                                            {quarter.CycleName}
                                                                        </div>
                                                                        <small className="text-muted d-block">
                                                                            {new Date(quarter.StartDate).toLocaleDateString("en-GB")}
                                                                            {" - "}
                                                                            {new Date(quarter.EndDate).toLocaleDateString("en-GB")}
                                                                        </small>
                                                                    </div>
                                                                </div>
                                                                <Tooltip title={quarter.Comments || "No comments available"}>
                                                                    <i
                                                                        className="bi bi-chat-square-text-fill text-primary fa-fade fs-5"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        style={{ cursor: "pointer" }}
                                                                    />
                                                                </Tooltip>
                                                            </div>
                                                            <div className="d-flex justify-content-between align-items-center mt-3">
                                                                <span className={`badge ${getStatusClass(quarter.Status).badge}`}>
                                                                    <i className={`bi bi-circle-fill me-2 ${getStatusClass(quarter.Status).icon}`}
                                                                        style={{ fontSize: 7 }}
                                                                    />
                                                                    {quarter.Status}
                                                                </span>
                                                                <div className="fw-bold text-success">
                                                                    <i className="bi bi-award-fill me-1"></i>
                                                                    {Number(quarter.CycleScore ?? 0).toFixed(2)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {reviewCycleData.length > 0 && selectedQuarter && selectedEmployee && (
                                <div className='col-12'>
                                    <div className="card border-0 shadow-sm rounded-4">
                                        <div className="card-header border-0 py-3 px-4">
                                            <div className="d-flex align-items-center justify-content-between w-100">
                                                <div>
                                                    <h5 className="fw-bold mb-0">
                                                        <i className="bi bi-bullseye text-primary me-2"></i>
                                                        KPI Details
                                                    </h5>
                                                    <small className="text-muted">
                                                        Review and manage KPI targets & weightage
                                                    </small>
                                                </div>
                                            </div>
                                        </div>

                                        {loading ? (
                                            <div className="p-4">
                                                <Skeleton active paragraph={{ rows: 8 }} title />
                                            </div>
                                        ) : (
                                            <div className='card-body'>
                                                <div
                                                    className="table-responsive review-table-container custom-scrollbar mb-4"
                                                    style={{ maxHeight: "500px", overflowY: "auto" }}
                                                >
                                                    {editableKPIs?.map((item, index) => {
                                                        const cardId = item.Id ?? index;
                                                        const isExpanded = expandedCards.has(cardId);
                                                        return (
                                                            <div className="card shadow-sm border-0 rounded-4 mb-4 mx-2" key={cardId}>
                                                                <div className="card-body p-3">

                                                                    {/* ===== Header (always visible, click to expand/collapse) ===== */}
                                                                    <div
                                                                        className="d-flex justify-content-between align-items-center"
                                                                        style={{ cursor: "pointer" }}
                                                                        onClick={() => toggleCard(cardId)}
                                                                    >
                                                                        <div className="d-flex align-items-center">
                                                                            <i className={`bi ${isExpanded ? "bi-chevron-down" : "bi-chevron-right"} text-muted me-3`}></i>

                                                                            <div
                                                                                className="rounded-circle bg-light-success text-success fw-bold d-flex align-items-center justify-content-center shadow-sm"
                                                                                style={{
                                                                                    width: 34,
                                                                                    height: 34,
                                                                                    fontSize: 13
                                                                                }}
                                                                            >
                                                                                {String(index + 1).padStart(2, "0")}
                                                                            </div>

                                                                            <div className="ms-3">
                                                                                <div className="d-flex align-items-center">
                                                                                    <h5 className="fw-bold mb-0">{item.KPIName}</h5>

                                                                                    {item.Objectives && (
                                                                                        <Tooltip
                                                                                            title={
                                                                                                <div
                                                                                                    dangerouslySetInnerHTML={{ __html: item.Objectives }}
                                                                                                />
                                                                                            }
                                                                                        >
                                                                                            <i className="bi bi-question-circle-fill text-primary ms-2 fs-6"></i>
                                                                                        </Tooltip>
                                                                                    )}
                                                                                </div>
                                                                                <span className="badge bg-light-primary text-primary mt-1 me-2">
                                                                                    <i className="bi bi-rulers me-1 text-primary"></i>
                                                                                    {item.UOMName || 'N/A'}
                                                                                </span>
                                                                                <span className="badge bg-light-success text-success mt-1">
                                                                                    <i className="bi bi-check-circle me-1 text-success"></i>
                                                                                    {item.Status || 'Pending'}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="text-end me-2">
                                                                            <small className="text-muted">
                                                                                <i className="bi bi-award me-1"></i>
                                                                                Final Score
                                                                            </small>

                                                                            <h3 className="fw-bold text-primary mb-0">
                                                                                {Number(item.WeightedScore ?? 0).toFixed(2)}
                                                                            </h3>
                                                                        </div>
                                                                    </div>

                                                                    {/* ===== Remaining content (only shown when this card is expanded) ===== */}
                                                                    {isExpanded && (
                                                                        <>
                                                                            <hr />

                                                                            <div className="d-flex gap-2 mb-3 flex-wrap">
                                                                                <div className="flex-fill" style={{ minWidth: "180px" }}>
                                                                                    <div className="metric-box">
                                                                                        <div className="metric-icon bg-light-primary">
                                                                                            <i className="bi bi-bullseye text-primary"></i>
                                                                                        </div>
                                                                                        <div className="metric-content">
                                                                                            <span>Target</span>
                                                                                            <h6>{item.Target ?? "-"}</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-fill" style={{ minWidth: "180px" }}>
                                                                                    <div className="metric-box">
                                                                                        <div className="metric-icon bg-light-info">
                                                                                            <i className="bi bi-percent text-info"></i>
                                                                                        </div>
                                                                                        <div className="metric-content">
                                                                                            <span>{item.AppliedWeightage ? 'Applied ' : ''}Weight{item.AppliedWeightage ? 'age' : ''}</span>
                                                                                            <h6>{item.AppliedWeightage ? item.AppliedWeightage : item.Weightage}%</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-fill" style={{ minWidth: "180px" }}>
                                                                                    <div className="metric-box">
                                                                                        <div className="metric-icon bg-light-success">
                                                                                            <i className="bi bi-calculator-fill text-success"></i>
                                                                                        </div>
                                                                                        <div className="metric-content">
                                                                                            <span>Calculated Score</span>
                                                                                            <h6>{item.CalculatedScore ?? "-"}</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-fill" style={{ minWidth: "180px" }}>
                                                                                    <div className="metric-box">
                                                                                        <div className="metric-icon bg-light-danger">
                                                                                            <i className="bi bi-bar-chart-line-fill text-danger"></i>
                                                                                        </div>
                                                                                        <div className="metric-content">
                                                                                            <span>Weighted Score</span>
                                                                                            <h6>{item.WeightedScore ?? "-"}</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-fill" style={{ minWidth: "180px" }}>
                                                                                    <div className="metric-box">
                                                                                        <div className="metric-icon bg-light-dark">
                                                                                            <i className="bi bi-rulers text-dark"></i>
                                                                                        </div>
                                                                                        <div className="metric-content">
                                                                                            <span>Measurables</span>
                                                                                            <h6>{item.Measurables ?? "-"}</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="row g-4">
                                                                                {/* Self Review */}
                                                                                <div className="col-lg-6">
                                                                                    <div className="card border h-100">
                                                                                        <div className="card-body">
                                                                                            <div className="d-flex align-items-center border-bottom pb-2 mb-3">
                                                                                                <i className="bi bi-person-fill text-primary me-2 fs-5"></i>
                                                                                                <h6 className="mb-0 fw-bold">Self Review</h6>
                                                                                            </div>

                                                                                            <div className="mb-3">
                                                                                                <label className="small fw-semibold mb-1">
                                                                                                    <i className="bi bi-star me-1 text-warning"></i>
                                                                                                    Self Score
                                                                                                </label>
                                                                                                <Input
                                                                                                    size="large"
                                                                                                    style={{ height: 40 }}
                                                                                                    type="number"
                                                                                                    value={item.Status === "DRAFT" ? "" : (item.Score1 ?? "")}
                                                                                                    disabled
                                                                                                />
                                                                                            </div>

                                                                                            <div>
                                                                                                <label className="small fw-semibold mb-1">
                                                                                                    <i className="bi bi-chat-left-text me-1 text-primary"></i>
                                                                                                    Self Feedback
                                                                                                </label>
                                                                                                <Input.TextArea
                                                                                                    rows={3}
                                                                                                    value={item.Status === "DRAFT" ? "" : (item.Remarks1 ?? "")}
                                                                                                    disabled
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                {/* Manager Review */}
                                                                                <div className="col-lg-6">
                                                                                    <div className="card border h-100">
                                                                                        <div className="card-body">
                                                                                            <div className="d-flex align-items-center border-bottom pb-2 mb-3">
                                                                                                <i className="bi bi-person-workspace text-success me-2 fs-5"></i>
                                                                                                <h6 className="mb-0 fw-bold">Manager Review</h6>
                                                                                            </div>

                                                                                            <div className="mb-3">
                                                                                                <label className="small fw-semibold mb-1">
                                                                                                    <i className="bi bi-star-fill me-1 text-warning"></i>
                                                                                                    Manager Score
                                                                                                </label>
                                                                                                <Input
    size="large"
    style={{ height: 40 }}
    type="number"
    min={0}
    max={100}
    step="0.01"
    value={item.Score2 ?? ""}
    disabled={
        loading ||
        sessionUserData?.RoleId === 3 ||
        item.Status === "DRAFT" ||
        !item.Remarks1 ||
        reviewStatus === "SUBMITTED" ||
        !["UNDER_REVIEW", "EVALUATED"].includes(reviewStatus)
    }
    onChange={(e) => {
        const value = e.target.value;

        if (value === "" || Number(value) <= 100) {
            handleInputChange(index, "Score2", value);
        }
    }}
    onWheel={(e) => e.target.blur()}
/>
                                                                                            </div>

                                                                                            <div>
                                                                                                <label className="small fw-semibold mb-1">
                                                                                                    <i className="bi bi-chat-left-text-fill me-1 text-success"></i>
                                                                                                    Manager Feedback
                                                                                                </label>
                                                                                                <Input.TextArea
                                                                                                    rows={3}
                                                                                                    value={item.Remarks2 ?? ""}
                                                                                                    disabled={
                                                                                                        loading ||
                                                                                                        sessionUserData?.RoleId === 3 ||
                                                                                                        item.Status === "DRAFT" ||
                                                                                                        !item.Remarks1 ||
                                                                                                        reviewStatus === "SUBMITTED" ||
                                                                                                        !["UNDER_REVIEW", "EVALUATED"].includes(reviewStatus)
                                                                                                    }
                                                                                                    onChange={(e) =>
                                                                                                        handleInputChange(index, "Remarks2", capitalizeFirstLetter(e.target.value))
                                                                                                    }
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="d-flex justify-content-end mt-3">
                                                                                <Button
                                                                                    type="default"
                                                                                    className="btn-premium-outline-info"
                                                                                    icon={<i className="bi bi-chat-square-text-fill"></i>}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedFeedback(item);
                                                                                        setFeedbackModal(true);
                                                                                    }}
                                                                                >
                                                                                    Any Time Feedback
                                                                                </Button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 border-top pt-4 mt-4">
                                                    <div className="d-flex align-items-center">
                                                        <div
                                                            className="rounded-circle bg-light-success d-flex align-items-center justify-content-center me-3"
                                                            style={{
                                                                width: 52,
                                                                height: 52
                                                            }}
                                                        >
                                                            <i className="bi bi-award-fill text-success fs-3"></i>
                                                        </div>
                                                        <div>
                                                            <div className="fw-bold fs-5">
                                                                Final Evaluation Score
                                                            </div>

                                                            <small className="text-muted">
                                                                Based on manager evaluation
                                                            </small>
                                                        </div>
                                                        <div
                                                            className="ms-4 px-4 py-2 rounded-3"
                                                            style={{
                                                                background: "#ecfdf3",
                                                                border: "1px solid #d1fae5"
                                                            }}
                                                        >
                                                            <span
                                                                className="fw-bold text-success"
                                                                style={{ fontSize: 22 }}
                                                            >
                                                                {Number(totalWeightedScore ?? 0).toFixed(2)}
                                                            </span>
                                                            <span className="text-muted ms-1">
                                                                /100
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center gap-3">
                                                        <Tooltip
                                                            title={
                                                                reviewStatus !== "UNDER_REVIEW" &&
                                                                    reviewStatus !== "EVALUATED"
                                                                    ? `Draft can only be saved when the review is UNDER_REVIEW or EVALUATED. Current status: ${reviewStatus}`
                                                                    : ""
                                                            }
                                                        >
                                                            <span>
                                                                <button
                                                                    className="btn btn-premium-primary btn-sm px-4"
                                                                    onClick={handleSaveReview}
                                                                    disabled={
                                                                        loading ||
                                                                        (reviewStatus !== "UNDER_REVIEW" &&
                                                                            reviewStatus !== "EVALUATED")
                                                                    }
                                                                >
                                                                    {loading ? (
                                                                        <>
                                                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                                                            Saving...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <i className="bi bi-floppy-fill me-2"></i>
                                                                            Save Draft
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </span>
                                                        </Tooltip>

                                                        <Tooltip
                                                            title={
                                                                reviewStatus === "SUBMITTED"
                                                                    ? "This evaluation has already been submitted."
                                                                    : reviewStatus !== "UNDER_REVIEW" &&
                                                                        reviewStatus !== "EVALUATED"
                                                                        ? `Submission is allowed only when the review is UNDER_REVIEW or EVALUATED. Current status: ${reviewStatus}`
                                                                        : ""
                                                            }
                                                        >
                                                            <span>
                                                                <button
                                                                    className="btn btn-success btn-sm px-4 fw-bold"
                                                                    onClick={handleSubmitReview}
                                                                    disabled={
                                                                        loading ||
                                                                        selectedQuarter?.Status === "CLOSED" ||
                                                                        reviewStatus === "SUBMITTED" ||
                                                                        (reviewStatus !== "UNDER_REVIEW" &&
                                                                            reviewStatus !== "EVALUATED")
                                                                    }
                                                                >
                                                                    {loading ? (
                                                                        <>
                                                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                                                            Submitting...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <i className="bi bi-send-check-fill me-2"></i>
                                                                            Submit Evaluation
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </span>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


            {/* Edit Assigned KPIs model */}
            <Modal
                open={editModalOpen}
                onCancel={() => setEditModalOpen(false)}
                footer={null}
                width={900}
                centered
                destroyOnClose
                title={
                    <div className="d-flex align-items-center">
                        <div className="symbol symbol-45px me-3">
                            <div className="symbol-label bg-light-primary">
                                <i className="bi bi-bullseye text-primary fs-3"></i>
                            </div>
                        </div>

                        <div>
                            <h4 className="mb-0 fw-bold">
                                Edit KPI Allocation
                            </h4>

                            <small className="text-muted">
                                Update KPI Target & Weightage
                            </small>
                        </div>
                    </div>
                }
            >
                <div className="card border-0 shadow-sm mt-5">
                    <div className="card-header border-0 pt-5">
                        <div className="d-flex align-items-center w-100">
                            <div>
                                <h3 className="fw-bold mb-1">
                                    Assigned KPIs
                                </h3>
                                <span className="text-muted fs-7">
                                    KPIs allocated for the selected employee and performance period
                                </span>
                            </div>

                            <div className="ms-auto">
                                <div className="card bg-light-primary border-0 px-4 py-3">
                                    <div className="text-muted fs-8">
                                        Total KPIs
                                    </div>

                                    <div className="fs-2 fw-bold text-primary">
                                        {empKPIData.length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card-body">
                        <div className="mb-4">
                            <label className="form-label fw-bold">Select KPI(s)</label>
                            <Select
                                mode="multiple"
                                allowClear
                                showSearch
                                size="large"
                                style={{ width: "100%" }}
                                placeholder="Search and select KPI(s)"
                                optionFilterProp="label"
                                onChange={handleAddKPIs}
                                options={availableKPIs?.map((kpi) => ({
                                    value: kpi.Id,
                                    label: kpi.KPIName,
                                }))}
                            />
                        </div>
                        <div className="table-responsive">
                            <table className="table table-row-bordered table-hover align-middle gs-0 gy-4">
                                <thead className="bg-light-primary">
                                    <tr className="fw-bold text-gray-700">
                                        <th width="60" className='text-center'>#</th>
                                        <th style={{ width: "28%" }}>KPI Name</th>
                                        <th width="110" className='text-center'>UoM</th>
                                        <th width="110" className="text-start">Objective</th>
                                        <th width="110" className="text-center">Target</th>
                                        <th width="110" className="text-center">Weightage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="text-center py-5">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : empKPIData.length > 0 ? (
                                        <>
                                            {empKPIData.map((item, index) => {
                                                const plainObjective = item.Objectives
                                                    ? new DOMParser()
                                                        .parseFromString(item.Objectives, "text/html")
                                                        .body.textContent
                                                    : "";

                                                const canEditTarget = item.IsNew || isAllCyclesDraft;

                                                return (
                                                    <tr
                                                        key={item.Id}
                                                        className={item.IsActive === 0 ? "table-danger opacity-50" : ""}
                                                    >
                                                        <td className="text-center fw-bold">{index + 1}</td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div>
                                                                    <Tooltip
                                                                        title={item.KPIName}
                                                                        placement="topLeft"
                                                                        overlayStyle={{ maxWidth: 350 }}
                                                                    >
                                                                        <div
                                                                            className="fw-bold"
                                                                            style={{ cursor: "pointer" }}
                                                                        >
                                                                            {item.KPIName
                                                                                ? item.KPIName.length > 26
                                                                                    ? `${item.KPIName.substring(0, 26)}...`
                                                                                    : item.KPIName
                                                                                : "-"}
                                                                        </div>
                                                                    </Tooltip>

                                                                    <small className="text-muted">
                                                                        KPI ID : {item.KPIId}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className="d-inline-flex align-items-center px-3 py-2 rounded-3 bg-light">
                                                                <i className="bi bi-speedometer2 text-primary me-2"></i>
                                                                <span className="fw-semibold text-dark">{item.UOMName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="text-start" style={{ maxWidth: "230px" }}>
                                                            <Tooltip
                                                                title={plainObjective || "No Objective"}
                                                                placement="topLeft"
                                                                overlayStyle={{ maxWidth: 350 }}
                                                            >
                                                                <span
                                                                    className="text-muted"
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        display: "inline-block",
                                                                        whiteSpace: "nowrap",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        maxWidth: "200px",
                                                                    }}
                                                                >
                                                                    {plainObjective
                                                                        ? plainObjective.length > 25
                                                                            ? `${plainObjective.substring(0, 25)}...`
                                                                            : plainObjective
                                                                        : "-"}
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="text-center">
                                                            <Input
                                                                type="number"
                                                                size="small"
                                                                value={item.Target}
                                                                onChange={(e) => updateField(index, "Target", e.target.value)}
                                                                disabled={!canEditTarget}
                                                            />
                                                        </td>
                                                        <td className="text-center">
                                                            <Input
                                                                type="number"
                                                                size="small"
                                                                value={item.Weightage}
                                                                onChange={(e) => updateField(index, "Weightage", e.target.value)}
                                                            />
                                                        </td>
                                                    </tr>
                                                )
                                            })}

                                            <tr>
                                                <td colSpan={9} className="text-end pt-4">
                                                    <button
                                                        className="btn btn-primary btn-sm px-5"
                                                        onClick={handleUpdateAll}
                                                        disabled={saving}
                                                    >
                                                        {saving ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                                Updating...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="bi bi-check2-circle me-2"></i>
                                                                Update KPI Allocation
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        </>
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="text-center py-5">
                                                <img
                                                    src="/media/illustrations/sketchy-1/5.png"
                                                    alt=""
                                                    style={{ width: "120px" }}
                                                />
                                                <h5 className="mt-3">No KPIs Found</h5>
                                                <span className="text-muted">
                                                    No KPI has been allocated for the selected employee.
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </Modal>


            {/* Any time feedback Model */}
            <Modal
                open={feedbackModal}
                footer={null}
                centered
                width={900}
                destroyOnClose
                onCancel={() => {
                    setFeedbackModal(false);
                    setFeedback("");
                }}
            >
                <div className="feedback-modal">
                    <div className="feedback-header mb-3">
                        <div className="feedback-icon">
                            <i className="bi bi-chat-heart-fill text-white"></i>
                        </div>
                        <div className="flex-grow-1 ms-3">
                            <h5 className="fw-bold mb-0">
                                Performance Feedback
                            </h5>
                            <small className="text-muted">
                                Employee KPI Review
                            </small>
                        </div>
                        <span className="badge bg-light-primary text-primary px-3 py-2">
                            Score {Number(selectedFeedback?.WeightedScore ?? 0).toFixed(2)}
                        </span>
                    </div>

                    {/* KPI */}
                    <div className="feedback-kpi-card mb-4">
                        <div className="fw-bold fs-5">
                            {selectedFeedback?.KPIName}
                        </div>
                    </div>

                    {/* Previous Feedback */}
                    <div className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="fw-bold mb-0">
                                <i className="bi bi-clock-history text-primary me-2"></i>
                                Previous Feedback
                            </h6>

                            <span className="badge bg-light-secondary text-dark">
                                {feedbackData?.length || 0} Records
                            </span>
                        </div>

                        <div className="feedback-history">
                            {feedbackData?.length > 0 ? (
                                feedbackData.map((item, index) => (
                                    <div
                                        className="feedback-item"
                                        key={`${item.tablePrimaryId}-${index}`}
                                    >
                                        <div className="feedback-avatar bg-light-success">
                                            <i className="bi bi-person-check-fill text-success"></i>
                                        </div>
                                        <div className="feedback-content">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <strong>
                                                    Feedback #{feedbackData.length - index} <span className="text-info">({item.Name})</span>
                                                </strong>

                                                <div className="d-flex align-items-center gap-2">

                                                    <small className="text-info fw-bold">
                                                        {item.CommentedOn
                                                            ? new Date(item.CommentedOn.replace("Z", "")).toLocaleString(
                                                                "en-IN",
                                                                {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                    hour12: false,
                                                                }
                                                            )
                                                            : "-"}
                                                    </small>

                                                    {item.CommentedBy === sessionUserData?.Id && (
                                                        <Tooltip title="Edit Feedback">
                                                            <Button
                                                                type="default"
                                                                shape="circle"
                                                                size="small"
                                                                icon={<i className="bi bi-pencil-fill text-primary"></i>}
                                                                onClick={() => {
                                                                    setEditingCommentId(item.Id);
                                                                    setFeedback(item.CommentText);
                                                                }}
                                                                style={{
                                                                    border: "1px solid #dbe4f0",
                                                                    background: "#fff",
                                                                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-muted mt-1">
                                                {item.CommentText}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted py-4">
                                    <i className="bi bi-chat-left-text fs-2 d-block mb-2"></i>
                                    No previous feedback available.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Feedback */}
                    <div>
                        <label className="form-label fw-semibold">
                            <i className="bi bi-pencil-square text-primary me-2"></i>
                            {editingCommentId ? "Edit Feedback" : "Add New Feedback"}
                        </label>
                        <Input.TextArea
                            rows={5}
                            placeholder="Provide constructive feedback..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            maxLength={500} e
                            showCount
                        />
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-7">
                        <Button onClick={() => { setFeedbackModal(false); setFeedback(""); }}>
                            Cancel
                        </Button>

                        <Button
                            type="primary"
                            loading={feedbackLoading}
                            disabled={!feedback?.trim() || feedbackLoading}
                            icon={
                                !feedbackLoading
                                    ? <i className="bi bi-send-fill text-white"></i>
                                    : null
                            }
                            onClick={handleSaveFeedback}
                        >
                            {feedbackLoading
                                ? "Saving..."
                                : editingCommentId
                                    ? "Update Feedback"
                                    : "Save Feedback"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <style>
                {`
                    .feedback-header{
                        display:flex;
                        align-items:center;
                    }

                    .feedback-icon{
                        width:46px;
                        height:46px;
                        border-radius:12px;
                        background:linear-gradient(135deg,#009ef7,#7239ea);
                        display:flex;
                        justify-content:center;
                        align-items:center;
                        font-size:20px;
                    }

                    .feedback-kpi-card{
                        padding:14px 18px;
                        border:1px solid #edf2f7;
                        border-radius:12px;
                        background:#fafcff;
                    }

                    .feedback-history{
                        max-height:220px;
                        overflow:auto;
                        padding-right:6px;
                    }

                    .feedback-item{
                        display:flex;
                        gap:12px;
                        padding:14px;
                        border:1px solid #edf2f7;
                        border-radius:12px;
                        margin-bottom:12px;
                        transition:.25s;
                    }

                    .feedback-item:hover{
                        border-color:#009ef7;
                        box-shadow:0 5px 15px rgba(0,0,0,.05);
                    }

                    .feedback-avatar{
                        width:42px;
                        height:42px;
                        border-radius:50%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        flex-shrink:0;
                    }

                    .feedback-content{
                        flex:1;
                    }
                    .btn-premium-outline-info{
                        background:#fff !important;
                        color:#0dcaf0 !important;
                        border:1px solid #0dcaf0 !important;
                        border-radius:10px;
                        font-weight:600;
                    }

                    .btn-premium-outline-info:hover{
                        background:#0dcaf0 !important;
                        color:#fff !important;
                        border-color:#0dcaf0 !important;
                    }import { capitalizeFirstLetter } from './../../../utils/capital';

                                    .feedback-header{
                    display:flex;
                    align-items:center;
                    margin-bottom:24px;
                    }


                    .feedback-kpi-card{
                    margin-top:20px;
                    padding:18px;
                    border-radius:14px;
                    background:#f8fbff;
                    border:1px solid #e5eefc;
                    }

                    .feedback-modal textarea{
                    border-radius:12px;
                    }
                    .metric-box{
                        height:72px;
                        border:1px solid #edf1f7;
                        border-radius:12px;
                        display:flex;
                        align-items:center;
                        padding:12px 14px;
                        background:#fff;
                        transition:.25s;
                    }

                    .metric-box:hover{
                        transform:translateY(-2px);
                        box-shadow:0 8px 18px rgba(0,0,0,.08);
                        border-color:#009ef7;
                    }

                    .metric-icon{
                        width:42px;
                        height:42px;
                        border-radius:10px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        flex-shrink:0;
                        margin-right:12px;
                    }

                    .metric-icon i{
                        font-size:18px;
                    }

                    .metric-content{
                        display:flex;
                        flex-direction:column;
                        justify-content:center;
                        overflow:hidden;
                    }

                    .metric-content span{
                        font-size:12px;
                        color:#7e8299;
                        line-height:1;
                        margin-bottom:5px;
                    }

                    .metric-content h6{
                        margin:0;
                        font-size:18px;
                        font-weight:700;
                        color:#181c32;
                    }

                    .review-card{
                    transition:.3s;
                    border-radius:16px;
                    }

                    .review-card:hover{
                    transform:translateY(-4px);
                    box-shadow:0 12px 28px rgba(0,0,0,.08);
                    }

                    .ant-input,
                    .ant-input-number{
                    border-radius:10px;
                    }

                    .ant-input:focus,
                    .ant-input-number:focus-within{
                    box-shadow:0 0 0 3px rgba(0,158,247,.15);
                    }
                .review-quarter-card{
                    background:#fff;
                    border:1px solid #e9ecef;
                    border-radius:12px;
                    padding:16px;
                    transition:.25s;
                    cursor:pointer;
                    position:relative;
                }

                .review-quarter-card:hover:not(.quarter-disabled){
                    transform:translateY(-2px);
                    box-shadow:0 8px 18px rgba(0,0,0,.08);
                    border-color:#d6dbe3;
                }

                .active-quarter{
                    border:2px solid #0d6efd;
                    background:#eef5ff;
                    box-shadow:0 0 0 3px rgba(13,110,253,.15);
                }

                .active-quarter::before{
                    content:"";
                    position:absolute;
                    left:0;
                    top:0;
                    bottom:0;
                    width:5px;
                    background:#0d6efd;
                    border-radius:12px 0 0 12px;
                }

                .quarter-disabled{
                    background:#f8f9fa;
                    opacity:.65;
                    cursor:not-allowed;
                    filter:grayscale(.2);
                }

                .quarter-disabled:hover{
                    transform:none;
                    box-shadow:none;
                }

                .quarter-icon{
                    width:42px;
                    height:42px;
                    border-radius:10px;
                    background:#f1f3f5;
                    color:#6c757d;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                }

                .active-quarter .quarter-icon{
                    background:#dbeafe;
                    color:#0d6efd;
                }
                `}
            </style>
        </Base1>
    )
}