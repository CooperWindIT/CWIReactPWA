import React, { useCallback, useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select, Tooltip, message } from "antd";
import { fetchWithAuth } from "../../utils/api";
import PropTypes from "prop-types";

export default function RegisterMasterTypes({ typeCategory }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [deptsData, setDeptsData] = useState([]);
    const [addTypeLoading, setAddTypeLoading] = useState(false);
    const [selectedAddDeptId, setSelectedAddDeptId] = useState(null);
    const [typeName, setTypeName] = useState("");
    const [isPeripheral, setIsPeripheral] = useState(false);
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [typeSearchQuery, setTypeSearchQuery] = useState("");

    const { Option } = Select;

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setSessionModuleId(moduleId);
        }
    }, []);

    useEffect(() => {
        try {
            const rawMenu = sessionStorage.getItem("menuData");
            const parsedMenu = JSON.parse(rawMenu || "[]");

            // Ensure we have a valid number for comparison
            const modId = Number(sessionModuleId);
            let targetName = '';

            if (modId === 14) {
                targetName = 'Assets';
            } else if (modId === 15) {
                targetName = 'Documents';
            }

            if (targetName) {
                // Use .trim() and .toLowerCase() for a safer match
                const checkMenu = parsedMenu.find(item =>
                    item.MenuName?.trim().toLowerCase() === targetName.toLowerCase()
                );

                if (checkMenu?.ActionsIds) {
                    const actionIdArray = checkMenu.ActionsIds.split(",").map(Number);
                    setSessionActionIds(actionIdArray);
                }
            } else {
                console.warn("No targetName matched for sessionModuleId:", modId);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, [typeCategory, sessionModuleId]); // Added sessionModuleId as a dependency

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("masterTypesDdlData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setDeptsData(parsed.depts || []);
                return;
            }

            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const deptsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            setDeptsData(deptsFilteredData || []);

            sessionStorage.setItem(
                "masterTypesDdlData",
                JSON.stringify({
                    depts: deptsFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDeptsData([]);
        }
    };

    const fetchMasterTypes = useCallback(async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=${(typeCategory === 2 || (typeCategory === 3 && sessionModuleId == 15)) ? 0 : selectedAddDeptId}&ModuleId=${sessionModuleId}&TypeCategory=${typeCategory}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setAssetTypesData(data.ResultData || []);
            setDataLoading(false);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setAssetTypesData([]);
            setDataLoading(false);
        }
    }, [sessionUserData, selectedAddDeptId, sessionModuleId, typeCategory]);

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchMasterTypes();
        }
    }, [fetchMasterTypes, sessionUserData?.OrgId, typeCategory]);

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchDDLData();
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (deptsData && sessionUserData?.DeptId) {
            setSelectedAddDeptId(sessionUserData?.DeptId);
        }
    }, [sessionUserData, deptsData]);

    const handleAddTypeSubmit = async (e) => {
        e.preventDefault();

        if (!selectedAddDeptId) {
            Swal.fire({
                title: "warning",
                text: "Department field is mandatory.",
                icon: "warning",
            });
            setAddTypeLoading(false);
            return;
        }
        if (typeName.trim() === "") {
            Swal.fire({
                title: "warning",
                text: "Type name field is mandatory.",
                icon: "warning",
            });
            setAddTypeLoading(false);
            return;
        }
        setAddTypeLoading(true);

        const payload = {
            TypeCategory: typeCategory,
            TypeName: typeName,
            OrgId: sessionUserData.OrgId,
            CreatedBy: sessionUserData?.Id,
            DeptId: (typeCategory === 2 || (typeCategory === 3 && sessionModuleId == 15))
                ? 0
                : selectedAddDeptId,
            ModuleId: sessionModuleId,
            DirectAssign: isPeripheral ? 1 : 0,
        }

        try {
            const response = await fetchWithAuth(`Portal/AddMasterTypes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            setAddTypeLoading(false);

            if (result.ResultData.Status === "Success") {
                Swal.fire({
                    title: "Success",
                    text: `${typeLabelMap[typeCategory]} Type has been saved successfully.`,
                    icon: "success",
                }).then(() =>
                    setTypeName(""),
                    fetchMasterTypes()
                    // setSelectedAddDeptId(null),
                );
            } else {
                Swal.fire({
                    title: "Error",
                    text: "Something went wrong, please try after sometime.",
                    icon: "error",
                });
            }
        } catch (error) {
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setAddTypeLoading(false);
        }
    };

    const handleClear = () => {
        setSelectedAddDeptId(null);
        setTypeName("");
        // setAssetTypesData([]);
        // setSelectedGetDeptId(null);
    };

    const handleDeleteMasterType = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: `Do you want to delete ${typeLabelMap[typeCategory]} type?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: `<i class="bi bi-check2-all text-white me-1"></i>Yes, delete it!`,
            cancelButtonText: `<i class="bi bi-x-lg text-white me-1"></i>Cancel`
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        Id: item.Id,
                        UpdatedBy: sessionUserData?.Id,
                        Type: typeCategory,
                    };

                    const response = await fetchWithAuth(`Portal/InActiveMasterTypes`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });

                    const result = await response.json();

                    if (result.ResultData[0].ResponseCode === 200) {
                        // ✅ 500 = Success in your case
                        fetchMasterTypes();
                        message.success(`${typeLabelMap[typeCategory]} type has been deleted successfully.`);
                    } else if (result.ResultData[0].ResponseCode === 500) {
                        // ⚠️ 200 = Not Deleted / Warning
                        Swal.fire({
                            icon: 'warning',
                            title: 'Not Deleted',
                            text: result.ResultData[0].Message || "This record cannot be deleted at this time.",
                            confirmButtonColor: '#ffc107', // Warning Yellow
                        });
                    } else {
                        // ❌ Other Error codes
                        const errorData = await response.json();
                        message.error(errorData.ResultData[0]?.Message || "An unexpected error occurred.");
                    }
                } catch (error) {
                    console.error("Error during type delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    const filteredTypes = assetTypesData?.filter(type =>
        type.TypeName?.toLowerCase().includes(typeSearchQuery.toLowerCase())
    ) || [];

    const typeLabelMap = {
        1: "Asset",
        2: "Document",
        3: "Alert",
    };

    const isDeleteDisabled = sessionActionIds?.includes(29) ? true : false;

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAddMasterTypes"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAddMasterTypes {
                            width: 55% !important;
                        }
                    }
                `}
            </style>
            <div>
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-2">
                    <h5 id="offcanvasRightLabel" className="mb-0">{typeLabelMap[typeCategory] || "Type"} Types</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
                    <div className="card">
                        <div className="p-5">
                            <div className="row g-3 align-items-end mb-3">
                                {/* Department Select */}
                                {!(typeCategory === 2 || (typeCategory === 3 && sessionModuleId == 15)) && (
                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-bold text-gray-700">Select Department<spn className="text-danger fw-bold">*</spn></label>
                                        <Select
                                            placeholder="Select Department"
                                            showSearch
                                            filterOption={(input, option) =>
                                                option?.children?.toLowerCase().includes(input.toLowerCase())
                                            }
                                            style={{ height: '2.8rem', width: '100%' }}
                                            className="w-100"
                                            value={selectedAddDeptId || undefined}
                                            onChange={(value) => setSelectedAddDeptId(value)}
                                            disabled={addTypeLoading || sessionUserData?.RoleID === 3}
                                        >
                                            {deptsData?.map((dep) => {
                                                const isUserDept = dep.ItemId === sessionUserData?.DeptId;

                                                return (
                                                    <Option key={dep.ItemId} value={dep.ItemId}>
                                                        <div className="d-flex justify-content-between align-items-center w-100">
                                                            <span className={isUserDept ? "fw-bolder text-primary" : ""}>
                                                                {dep.ItemValue}
                                                            </span>
                                                            {isUserDept && (
                                                                <span
                                                                    className="badge badge-light-primary fw-bold"
                                                                    style={{ fontSize: '10px', padding: '2px 6px' }}
                                                                >
                                                                    MY DEPT
                                                                </span>
                                                            )}
                                                        </div>
                                                    </Option>
                                                );
                                            })}
                                        </Select>
                                    </div>
                                )}

                                {/* Type Name Input */}
                                <div className="col-12 col-md-5">
                                    <label className="form-label fw-bold text-gray-700">
                                        {typeLabelMap[typeCategory] || "Type"} Type Name<spn className="text-danger fw-bold">*</spn>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-solid shadow-sm border border-dark"
                                        placeholder="Enter type name"
                                        style={{ height: '2.8rem' }}
                                        value={typeName}
                                        onChange={(e) => setTypeName(e.target.value)}
                                        disabled={addTypeLoading}
                                        required
                                    />
                                </div>

                                {sessionModuleId === '14' && typeCategory === 1 && (
                                    <div className="col-12 col-md-3">
                                        <div className="d-flex align-items-center mb-2" style={{ height: '2.8rem' }}>
                                            <div className="form-check form-switch form-check-custom form-check-solid">
                                                <input
                                                    className="form-check-input h-25px w-45px cursor-pointer"
                                                    type="checkbox"
                                                    id="peripheralCheck"
                                                    checked={isPeripheral}
                                                    onChange={(e) => setIsPeripheral(e.target.checked)}
                                                    disabled={addTypeLoading}
                                                />
                                                <label className="form-check-label fw-bold text-gray-700 ms-3 d-flex align-items-center" htmlFor="peripheralCheck">
                                                    Direct Assign?
                                                    <Tooltip
                                                        title="Assets of this type will be directly assigned to technicians automatically upon ticket approval."
                                                        placement="top"
                                                        color="#3E97FF"
                                                    >
                                                        <span className="ms-2 text-muted opacity-75 cursor-help">
                                                            <i className="bi bi-info-circle fs-7 text-primary"></i>
                                                        </span>
                                                    </Tooltip>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm me-2"
                                    onClick={handleClear}
                                    disabled={addTypeLoading}
                                >
                                    <i className="fa-solid fa-broom"></i>Clear
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={handleAddTypeSubmit}
                                    disabled={addTypeLoading}
                                >
                                    <i className="bi bi-bookmark-check"></i>{addTypeLoading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm mt-4" style={{ borderRadius: '12px' }}>
                        <div className="card-body p-4">
                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mb-4">
                                <h5 className="fw-bold mb-0" style={{ color: "#1e293b" }}>
                                    Existing {typeLabelMap[typeCategory]} Types
                                    <span className="badge bg-light-primary text-primary ms-2 fs-9 px-2">
                                        {filteredTypes.length} Total
                                    </span>
                                </h5>

                                <div className="position-relative w-100 w-md-250px">
                                    <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                                    <input
                                        type="text"
                                        className="form-control form-control-solid ps-10 border-0 bg-light"
                                        placeholder="Search types..."
                                        style={{ borderRadius: '8px', fontSize: '0.85rem' }}
                                        value={typeSearchQuery}
                                        onChange={(e) => setTypeSearchQuery(e.target.value)}
                                    />
                                    {typeSearchQuery && (
                                        <button
                                            className="btn btn-flush position-absolute top-50 end-0 translate-middle-y me-2 p-0 border-0 bg-transparent"
                                            onClick={() => setTypeSearchQuery("")}
                                            type="button"
                                        >
                                            <i className="bi bi-x-circle-fill text-muted fs-7"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {dataLoading && (
                                <div className="d-flex justify-content-center py-5">
                                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                                    <span className="ms-3 text-muted fs-7">Updating list...</span>
                                </div>
                            )}

                            <div className="table-responsive" style={{ overflowX: 'hidden' }}>
                                <table className="table align-middle table-row-dashed fs-7 gy-2">
                                    <thead>
                                        <tr className="text-start text-gray-400 fw-bold fs-8 text-uppercase gs-0">
                                            <th className="w-50px text-center">#</th>
                                            <th className="min-w-150px">Type Name</th>
                                            <th className="text-center pe-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {filteredTypes.length > 0 ? (
                                            filteredTypes.map((type, indx) => {
                                                const isExpiryAlertType = type.DirectAssign === true;

                                                return (
                                                    <tr
                                                        key={type.Id || indx}
                                                        className={`transition-3ms ${isExpiryAlertType ? "bg-light-warning" : "hover-bg-light"}`}
                                                    >
                                                        <td className="text-gray-400 text-center">{indx + 1}</td>

                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span
                                                                    className="text-gray-800 fw-bold d-inline-block text-truncate"
                                                                    style={{ maxWidth: "150px" }}
                                                                    title={type.TypeName}
                                                                >
                                                                    {type.TypeName}
                                                                </span>

                                                                {isExpiryAlertType && (
                                                                    <span className="badge badge-light-warning text-warning border border-warning-subtle">
                                                                        <i className="bi bi-bell-fill text-warning me-1"></i>
                                                                        Expiry Alert Type
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="text-center">
                                                            <button
                                                                className="btn btn-icon btn-light-danger btn-sm border-0 shadow-sm rounded-circle"
                                                                style={{
                                                                    width: "32px",
                                                                    height: "32px",
                                                                    cursor: !isDeleteDisabled ? "not-allowed" : "pointer",
                                                                    opacity: !isDeleteDisabled ? 0.4 : 1
                                                                }}
                                                                onClick={() => isDeleteDisabled && handleDeleteMasterType(type)}
                                                                disabled={!isDeleteDisabled}
                                                            >
                                                                <i className="bi bi-trash3 fs-6"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="3" className="text-center py-10">
                                                    <div className="text-muted fs-7">No types found matching your search.</div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

RegisterMasterTypes.propTypes = {
    typeCategory: PropTypes.number.isRequired,
};