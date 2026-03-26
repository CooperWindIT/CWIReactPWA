
import React, { useState, useEffect } from "react";
import Base1 from "../Config/Base1";
import { Popover } from 'antd';
import { VMS_URL, VMS_URL_CONTRACTOR } from "../Config/Config";
import '../Config/Pagination.css';
// import AddUser from "./Add";
import Swal from 'sweetalert2';
import '../Config/Loader.css';
// import EditUser from "./Edit";
import { Link, useNavigate } from "react-router-dom";
import SubmitComment from "./SubmitComment";

export default function CheckinValidation () {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [checkinValidData, setCheckinValidData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [day, setDay] = useState("");
    const [validObj, setValidObj] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}GetCheckinValidations`);
            if (response.ok) {
                const data = await response.json();
                setCheckinValidData(data.ResultData);
                // console.log(data.ResultData)
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    const fetchDayData = async () => {
        try {
            if (sessionUserData && sessionUserData.Id) {
                const response = await fetch(`${VMS_URL_CONTRACTOR}GetValidDay?UserId=${sessionUserData?.Id}`);
                if (response.ok) {
                    const data = await response.json();
                    setDay(data.ResultData[0]);
                } else {
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } 
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchData();
            fetchDayData();
        }
    }, [sessionUserData]);

    const handleSubmitComment = (item) => {
        setValidObj(item);
    };

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    // const totalPages = Math.ceil(checkinValidData?.length / recordsPerPage);
    const totalPages = checkinValidData?.length ? Math.ceil(checkinValidData.length / recordsPerPage) : 0;

    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = checkinValidData?.slice(indexOfFirstRecord, indexOfLastRecord);

    const getPaginationNumbers = () => {
        if (totalPages <= 1) return [];
    
        const visiblePages = [];
        if (totalPages <= 6) {
            for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
        } else {
            if (currentPage <= 3) {
                visiblePages.push(1, 2, 3, "...", totalPages - 2, totalPages - 1, totalPages);
            } else if (currentPage > 3 && currentPage < totalPages - 2) {
                visiblePages.push(1, 2, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages - 1, totalPages);
            } else {
                visiblePages.push(1, 2, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            }
        }
        return visiblePages;
    };
    

    const handlePageClick = (page) => {
        if (page !== "...") setCurrentPage(page);
    };

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-GB');
        const formattedTime = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `${formattedDate} ${formattedTime}`;
    };

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Checkin List</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <Link to='/dashboard' className="text-muted text-hover-primary">Home</Link>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Checkin Validation</li>
                        </ul>
                    </div>
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        <a
                            className={`btn btn-primary ${ sessionUserData.RoleId === 1 ? "d-block" : "d-none"}`}
                            title={`${day.DAY}`}
                            style={{ height: "3rem" }}>Check Day
                        </a>
                    </div>
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="row gy-10 gx-xl-10"></div>
                    <div className="card mt-5">  
                        <div className="card-body pt-0">
                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-5" id="kt_customers_table">
                                    <thead>
                                        <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                            <th className="">S.No</th>
                                            <th className="min-w-125px">Day</th>
                                            <th className="min-w-125px">CLS1</th>
                                            <th className="min-w-125px">CLS2</th>
                                            <th className="min-w-125px">Comments</th>
                                            <th className="">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {dataLoading ? (
                                            <tr>
                                                <td colSpan="8" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                        ) : currentRecords && currentRecords.length > 0 ? (
                                            currentRecords.map((item, index) => (
                                                <tr>
                                                <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                    <td>
                                                        <a className="text-gray-800 text-hover-primary mb-1">{item.Day}</a>
                                                    </td>
                                                    <td>
                                                        <a className="text-gray-600 text-hover-primary mb-1">{item.CLS1 || 'N/A'}</a>
                                                    </td>
                                                    <td>{item.CLS2 || 'N/A'}</td>
                                                    <td className="text-info">{formatDate(item.CreatedDate)}</td>
                                                    <td className="">
                                                        <Popover 
                                                            placement="bottom" 
                                                            content={
                                                                <div style={{ width: '8rem' }}>
                                                                    <p 
                                                                        style={{ cursor: 'pointer' }} 
                                                                        className="text-hover-warning"
                                                                        data-bs-toggle="offcanvas" 
                                                                        data-bs-target="#offcanvasRightSubmitComm" 
                                                                        aria-controls="offcanvasRightSubmitComm"    
                                                                        onClick={() => handleSubmitComment(item)}
                                                                    >
                                                                        <i className="fa-regular fa-pen-to-square me-2 text-info"></i>
                                                                        Submit
                                                                    </p>
                                                                </div>
                                                            }
                                                            trigger="click"
                                                        >
                                                            <button 
                                                                className="btn"
                                                            >
                                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                                            </button>
                                                        </Popover>
                                                    </td>
                                                </tr>
                                            ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="8" className="text-center">
                                                        <p>No Data Available</p>
                                                    </td>
                                                </tr>
                                            )}
                                    </tbody>
                                </table>
                                <div className={`dt-paging paging_simple_numbers ${currentRecords ? 'd-none' : 'd-block'}`}>
                                    <nav aria-label="pagination">
                                        <ul className="pagination">
                                            <li
                                                className={`dt-paging-button page-item ${currentPage === 1 ? "disabled" : ""}`}
                                            >
                                                <button
                                                    className="page-link previous"
                                                    role="link"
                                                    type="button"
                                                    aria-controls="kt_customers_table"
                                                    aria-disabled={currentPage === 1}
                                                    aria-label="Previous"
                                                    onClick={handlePrevious}
                                                >
                                                    <i className="previous"></i>
                                                </button>
                                            </li>

                                            {/* Page Numbers */}
                                            {getPaginationNumbers().map((page, index) => (
                                                <li
                                                    key={index}
                                                    className={`dt-paging-button page-item ${page === currentPage ? "active" : ""}`}
                                                >
                                                    <button
                                                        className="page-link"
                                                        role="link"
                                                        type="button"
                                                        aria-controls="kt_customers_table"
                                                        aria-current={page === currentPage ? "page" : undefined}
                                                        onClick={() => handlePageClick(page)}
                                                        disabled={page === "..."}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            ))}

                                            {/* Next Button */}
                                            <li
                                                className={`dt-paging-button page-item ${currentPage === totalPages ? "disabled" : ""}`}
                                            >
                                                <button
                                                    className="page-link next"
                                                    role="link"
                                                    type="button"
                                                    aria-controls="kt_customers_table"
                                                    aria-disabled={currentPage === totalPages}
                                                    aria-label="Next"
                                                    onClick={handleNext}
                                                >
                                                    <i className="next"></i>
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>    

            <SubmitComment validObj={validObj} />
                 
        </Base1>
    )
}