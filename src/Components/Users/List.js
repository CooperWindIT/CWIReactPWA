import React, { useState, useEffect, useRef } from "react";
import Base1 from "../Config/Base1";
import { Popover } from 'antd';
import { BASE_API, BASE_IMAGE_API_GET } from "../Config/Config";
import '../Config/Pagination.css';
import AddUser from "./Add";
import EditUser from "./Edit";
import Swal from 'sweetalert2';
import '../Config/Loader.css';
import { Link, useNavigate } from "react-router-dom";

const AVATAR_PALETTE = ["#6f42c1", "#0d6efd", "#20c997", "#fd7e14", "#e83e8c", "#0dcaf0", "#6610f2", "#198754"];

const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "?";
    return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

const getAvatarColor = (name) => {
    if (!name) return AVATAR_PALETTE[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

export default function UsersList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [eitData, setEditData] = useState([]);

    const [navigationPath, setNavigationPath] = useState("");

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const navigationString = sessionStorage.getItem("navigationPath");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
            setNavigationPath(navigationString);
        } else {
            navigate("/");
        }
    }, [navigate]);

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const response = await fetch(`${BASE_API}/AdminRoutes/getUsers?OrgId=${sessionUserData.OrgId}`);
            if (response.ok) {
                const data = await response.json();
                setUsersData(data.ResultData);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchData();
        }
    }, [sessionUserData]);

    const filteredData = Array.isArray(usersData)
    ? usersData.filter((item) => {
        const userName = String(item?.Name ?? '').toLowerCase();
        const email = String(item?.Email ?? '').toLowerCase();
        const role = String(item?.RoleName ?? '').toLowerCase();
        const query = String(searchQuery ?? '').toLowerCase();

        return (
            userName.includes(query) ||
            email.includes(query) ||
            role.includes(query)
        );
    })
    : [];

    const handleEdit = (item) => {
        setEditData(item);
    };

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    const totalPages = Math.ceil(filteredData.length / recordsPerPage);

    // Get current records to display
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const getPaginationNumbers = () => {
        const visiblePages = [];
        if (totalPages <= 6) {
            for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
        } else {
            if (currentPage <= 3) {
                visiblePages.push(1, 2, 3, "...", totalPages - 2, totalPages - 1, totalPages);
            }
            else if (currentPage > 3 && currentPage < totalPages - 2) {
                visiblePages.push(1, 2, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages - 1, totalPages);
            }
            else {
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


    const handleDeleteUser = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete user?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const now = new Date();
                    const currentTime = `${now.getFullYear()}-${String(
                        now.getMonth() + 1
                    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(
                        now.getHours()
                    ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
                        now.getSeconds()
                    ).padStart(2, "0")}.000`;

                    const payload = {
                        UpdatedBy: sessionUserData.Id,
                        Id: item.Id
                    };

                    const response = await fetch(`${BASE_API}UsersInActive`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        fetchData();
                        Swal.fire("Success!", "User has been deleted.", "success");
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete user.", "error");
                    }
                } catch (error) {
                    console.error("Error during user delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    return (
        <Base1>
            <style>{`
                .cwi-ul-toolbar-actions .cwi-ul-btn-create {
                    border-radius: 0.75rem;
                    font-weight: 600;
                    letter-spacing: 0.01em;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .cwi-ul-toolbar-actions .cwi-ul-btn-create:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 14px rgba(0,0,0,0.14) !important;
                }
                .cwi-ul-card {
                    border-radius: 1rem;
                    border: 1px solid rgba(0,0,0,0.06);
                    overflow: hidden;
                }
                .cwi-ul-search-wrap .form-control {
                    border-radius: 2rem;
                    transition: box-shadow 0.15s ease;
                }
                .cwi-ul-search-wrap .form-control:focus {
                    box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15);
                }
                .cwi-ul-table tbody tr {
                    transition: background-color 0.12s ease;
                }
                .cwi-ul-table tbody tr:hover {
                    background-color: rgba(13, 110, 253, 0.035);
                }
                .cwi-ul-avatar {
                    width: 35px;
                    height: 35px;
                    min-width: 35px;
                    border-radius: 50%;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #fff;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                }
                .cwi-ul-role-badge, .cwi-ul-gender-badge {
                    border-radius: 2rem;
                    padding: 0.4rem 0.85rem;
                    font-weight: 600;
                    font-size: 0.75rem;
                }
                .cwi-ul-action-btn {
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.12s ease;
                }
                .cwi-ul-action-btn:hover {
                    background-color: rgba(0,0,0,0.05);
                }
                .cwi-ul-action-menu {
                    min-width: 9rem;
                }
                .cwi-ul-action-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.6rem;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    font-weight: 500;
                    transition: background-color 0.12s ease;
                }
                .cwi-ul-action-item:hover {
                    background-color: rgba(0,0,0,0.05);
                }
                .cwi-ul-empty-state, .cwi-ul-loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 0.75rem;
                    padding: 2.5rem 1rem;
                    color: #8a8fa3;
                }
                .cwi-ul-pagination .page-link {
                    border-radius: 0.6rem !important;
                    margin: 0 0.15rem;
                    border: none;
                    transition: transform 0.12s ease, box-shadow 0.12s ease;
                }
                .cwi-ul-pagination .page-item.active .page-link {
                    background: linear-gradient(135deg, #0d6efd, #6610f2);
                    color: #fff;
                    box-shadow: 0 4px 10px rgba(13,110,253,0.3);
                }
                .cwi-ul-pagination .page-item:not(.active):not(.disabled) .page-link:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 3px 8px rgba(0,0,0,0.12);
                }
                .cwi-ul-mobile-card {
                    border-radius: 1rem;
                    transition: transform 0.12s ease, box-shadow 0.12s ease;
                }
                .cwi-ul-mobile-card:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.1) !important;
                }
            `}</style>

            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Users List</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Users</li>
                        </ul>
                    </div>
                    <div className="d-flex align-items-center gap-2 gap-lg-3 cwi-ul-toolbar-actions">
                        <a
                            className={`btn btn-primary d-none d-md-inline-flex align-items-center gap-2 btn-sm shadow-sm cwi-ul-btn-create ${sessionUserData.RoleId === 3 || sessionUserData.RoleId === 1 ? "d-md-inline-flex" : "d-none"
                                }`}
                            style={{ height: "3rem" }}
                            data-bs-toggle="offcanvas"
                            data-bs-target="#offcanvasRightAdd"
                            aria-controls="offcanvasRightAdd">
                            <i className="fa-solid fa-plus"></i> Add User
                        </a>
                        <a
                            className={`btn btn-light-primary btn-sm shadow-sm d-flex align-items-center justify-content-center d-md-none cwi-ul-btn-create ${sessionUserData.RoleId === 3 || sessionUserData.RoleId === 1 ? "d-flex" : "d-none"
                                }`}
                            style={{ height: "3rem", width: "3rem", borderRadius: "50%" }}
                            data-bs-toggle="offcanvas"
                            data-bs-target="#offcanvasRightAdd"
                            aria-controls="offcanvasRightAdd"><i className="fa-solid fa-plus fs-2"></i>
                        </a>
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className="app-content flex-column-fluid mb-10" style={{ marginTop: "-35px" }}>
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card d-md-block d-none mt-5 cwi-ul-card shadow-sm">
                        <div className="card-header border-0 pt-6">
                            <div className="card-title">
                                <div className="d-flex align-items-center position-relative my-1 cwi-ul-search-wrap">
                                    <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-5">
                                        <span className="path1"></span>
                                        <span className="path2"></span>
                                    </i>
                                    <input
                                        type="text"
                                        data-kt-customer-table-filter="search"
                                        className="form-control form-control-solid w-250px ps-13"
                                        placeholder="Search Users"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="card-body pt-0">
                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-5 cwi-ul-table" id="kt_customers_table">
                                    <thead>
                                        <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                            <th className="">S.No</th>
                                            <th className="min-w-125px">Name</th>
                                            <th className="min-w-125px">Email</th>
                                            <th className="min-w-125px">Mobile</th>
                                            <th className="min-w-125px">Gender</th>
                                            <th className="min-w-100px">Role</th>
                                            <th className="min-w-100px">Superior</th>
                                            <th className="">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {dataLoading ? (
                                            <tr>
                                                <td colSpan="7" className="text-center">
                                                    <div className="cwi-ul-loading-state">
                                                        <div className="spinner-border text-primary" role="status" style={{ width: "2.5rem", height: "2.5rem" }}></div>
                                                        <span className="fs-7">Loading users...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : currentRecords && currentRecords.length > 0 ? (
                                            currentRecords.map((item, index) => (
                                                <tr key={item.Id}>
                                                    <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                    <td>
    <div className="d-flex align-items-center">
        <div
            className="cwi-ul-avatar me-3"
            style={{
                backgroundColor: getAvatarColor(item.Name),
                width: "42px",
                height: "42px",
                borderRadius: "50% 50% 50% 12px",
                transform: "rotate(45deg)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {item.ImageURL ? (
                <img
                    src={`${BASE_IMAGE_API_GET}${item.ImageUrl}`}
                    alt={item.Name || "Employee"}
                    style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: "rotate(-45deg) scale(1.4)",
                    }}
                />
            ) : (
                <span
                    style={{
                        transform: "rotate(-45deg)",
                        color: "#fff",
                        fontWeight: "600",
                    }}
                >
                    {getInitials(item.Name)}
                </span>
            )}
        </div>

        <a
            className="text-gray-800 text-hover-primary fw-semibold mb-1"
            href="#"
            onClick={(e) => e.preventDefault()}
        >
            {item.Name}
        </a>
    </div>
</td>
                                                    <td>
                                                        <a href="#" className="text-gray-600 text-hover-primary mb-1">{item.Email}</a>
                                                    </td>
                                                    <td>{item.Mobile || 'N/A'}</td>
                                                    <td>
                                                        <span className={`badge cwi-ul-gender-badge ${item.Gender === 1 ? 'badge-light-info' : 'badge-light-danger'}`}>
                                                            {item.Gender === 1 ? 'Male' : 'Female'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-light-primary cwi-ul-role-badge">{item.RoleName}</span>
                                                    </td>
                                                    <td>
                                                        <span className="badge badge-light-primary cwi-ul-role-badge">{item.SuperiorName || '       '}</span>
                                                    </td>
                                                    <td className="">
                                                        <Popover
                                                            placement="bottom"
                                                            content={
                                                                <div className="cwi-ul-action-menu">
                                                                    <div
                                                                        className="cwi-ul-action-item"
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightEdit"
                                                                        aria-controls="offcanvasRightEdit"
                                                                        onClick={() => handleEdit(item)}
                                                                    >
                                                                        <i className="fa-regular fa-pen-to-square text-info"></i>
                                                                        <span>Edit</span>
                                                                    </div>
                                                                    <div
                                                                        className="cwi-ul-action-item"
                                                                        onClick={() => handleDeleteUser(item)}
                                                                    >
                                                                        <i className="fa-regular fa-trash-can text-danger"></i>
                                                                        <span>Delete</span>
                                                                    </div>
                                                                </div>
                                                            }
                                                            trigger="hover"
                                                        >
                                                            <button
                                                                className="btn cwi-ul-action-btn"
                                                            >
                                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                                            </button>
                                                        </Popover>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="text-center">
                                                    <div className="cwi-ul-empty-state">
                                                        <i className="fa-regular fa-folder-open fs-1 opacity-50"></i>
                                                        <span>No users found</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                <div className="dt-paging paging_simple_numbers">
                                    <nav aria-label="pagination">
                                        <ul className="pagination cwi-ul-pagination">
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

                    <div className="d-block d-md-none">
                        <div className="d-flex align-items-center position-relative my-1 cwi-ul-search-wrap">
                            <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-5">
                                <span className="path1"></span>
                                <span className="path2"></span>
                            </i>
                            <input
                                type="text"
                                data-kt-customer-table-filter="search"
                                className="form-control form-control w-100 ps-13"
                                placeholder="Search Users"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {dataLoading ? (
                            <div className="cwi-ul-loading-state">
                                <div className="spinner-border text-primary" role="status" style={{ width: "2.5rem", height: "2.5rem" }}></div>
                                <span className="fs-7">Loading users...</span>
                            </div>
                        ) : currentRecords && currentRecords.length > 0 ? (
                            currentRecords.map((item, index) => (
                                <div key={item.Id} className="card mb-2 shadow-sm cwi-ul-mobile-card">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="cwi-ul-avatar" style={{ backgroundColor: getAvatarColor(item.Name) }}>
                                                    {getInitials(item.Name)}
                                                </div>
                                                <span className={`badge cwi-ul-gender-badge ${item.Gender === 1 ? 'badge-light-info' : 'badge-light-danger'}`}>
                                                    {item.Gender === 1 ? 'Male' : 'Female'}
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center gap-3">
                                                <i
                                                    className={`fa-regular fa-pen-to-square ${item.IsActive ? 'text-info cursor-pointer' : 'text-muted'}`}
                                                    data-bs-toggle={item.IsActive ? "offcanvas" : undefined}
                                                    data-bs-target={item.IsActive ? "#offcanvasRightEdit" : undefined}
                                                    onClick={() => item.IsActive && handleEdit(item)}
                                                    style={!item.IsActive ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                                                    title={!item.IsActive ? "Cannot edit inactive contractor" : "Edit"}
                                                ></i>
                                                <i className="fa-regular fa-trash-can text-danger" onClick={() => handleDeleteUser(item)}></i>
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Name:</span>
                                                <span className="fw-semibold">{item.Name && item.Name.length > 20 ? item.Name.slice(0, 20) + '...' : item.Name}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Mobile:</span>
                                                <span className="fw-semibold">{item.Mobile}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Email:</span>
                                                <span className="fw-semibold">{item.Email && item.Email.length > 20 ? item.Email.slice(0, 20) + '...' : item.Email}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Role:</span>
                                                <span className="badge badge-light-primary cwi-ul-role-badge">{item.RoleName}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="cwi-ul-empty-state">
                                <i className="fa-regular fa-folder-open fs-1 opacity-50"></i>
                                <span>No users found</span>
                            </div>
                        )}
                        <div className="dt-paging paging_simple_numbers">
                            <nav aria-label="pagination">
                                <ul className="pagination cwi-ul-pagination">
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

            <EditUser editObj={eitData} />
            <AddUser />

        </Base1>
    )
}