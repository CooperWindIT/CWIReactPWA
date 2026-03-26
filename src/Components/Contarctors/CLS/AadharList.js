import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { BASE_API, VMS_URL, VMS_URL_CONTRACTOR, VMS_VISITORS } from "../../Config/Config";
import { Select } from "antd";

export default function CLsAadhars() {

    const [sessionUserData, setsessionUserData] = useState({});
    const [contCls, setContCls] = useState([]);
    const [contClsLoading, setContClsLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const fetchContractorCLs = async () => {
        setContClsLoading(true);
        if (sessionUserData.OrgId) {
            try {
                const response = await fetch(`${VMS_URL_CONTRACTOR}getCLS?OrgId=${sessionUserData?.OrgId}&ContractorId=0`);
                if (response.ok) {
                    const data = await response.json();
                    setContCls(data.ResultData || []);
                    setContClsLoading(false);
                } else {
                    setContClsLoading(false);
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                setContClsLoading(false);
                setContCls([]);
                console.error('Error fetching attendance data:', error.message);
            } finally {
                setContClsLoading(false);
            }
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchContractorCLs();
        }
    }, [sessionUserData.OrgId]);

    const formatAadhar = (aadhar) => {
        if (!aadhar) return "";
        return aadhar.replace(/(\d{4})(?=\d)/g, "$1 ");
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightCLsAadhar"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightCLsAadhar {
                            width: 70% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off">
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">CL's Aadhar List</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{
                    marginTop: "-2rem",
                    maxHeight: "calc(100vh - 4rem)",  // take full height minus top offset
                    overflowY: "auto"
                }}>
                    <div className="row">
                        <div className="table-responsive">
                            <table className="table table-bordered table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Contractor Name</th>
                                        <th>CL Name</th>
                                        <th>Aadhar</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contClsLoading ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-3">
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : contCls.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-3 text-danger">
                                                No Data Available
                                            </td>
                                        </tr>
                                    ) : (
                                        contCls.map((item, index) => (
                                            <tr key={item.Id || index}>
                                                <td>{index + 1}</td>
                                                <td title={item.ContractorName}>
                                                    {item.ContractorName && item.ContractorName.length > 20
                                                        ? item.ContractorName.substring(0, 20) + "..."
                                                        : item.ContractorName}
                                                </td>
                                                <td title={item.Name}>
                                                    {item.Name && item.Name.length > 15
                                                        ? item.Name.substring(0, 15) + "..."
                                                        : item.Name}
                                                </td>
                                                <td>{formatAadhar(item.AadharNo)}</td>
                                                <td>
                                                    {item.StartDate
                                                        ? new Date(item.StartDate).toLocaleDateString("en-GB") // dd/mm/yyyy
                                                        : ""}
                                                </td>
                                                <td>
                                                    {item.EndDate
                                                        ? new Date(item.EndDate).toLocaleDateString("en-GB") // dd/mm/yyyy
                                                        : ""}
                                                </td>
                                                <td>
                                                    <div className="d-flex justify-content-center align-items-center">
                                                        <div className="form-check form-switch m-0">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                checked={item.IsActive}
                                                                style={{ width: "2.5rem", height: "1.4rem" }}
                                                                readOnly
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </form>

        </div>
    );
}
