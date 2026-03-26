// src/components/Pagination/Pagination.jsx
import React, { useState, useEffect } from "react";

const Pagination = ({ currentPage, totalPages, onPageChange, totalRecords, recordsPerPage }) => {
  // 1. Detect Screen Size for Responsive Logic
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (totalPages <= 1 && totalRecords <= recordsPerPage) return null;

  const total = Number(totalRecords) || 0;
  const perPage = Number(recordsPerPage) || 10;
  const current = Number(currentPage) || 1;

  const startRecord = total === 0 ? 0 : (current - 1) * perPage + 1;
  const endRecord = Math.min(current * perPage, total);

  // 2. Compact Pagination for Mobile
  const getPaginationNumbers = () => {
    // On mobile, show only 3 numbers; on desktop show 7
    const totalNumbers = isMobile ? 3 : 7;
    const visiblePages = [];

    if (totalPages <= totalNumbers) {
      for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
    } else {
      // Mobile Logic: Show current, one before, and one after
      let left = Math.max(2, current - (isMobile ? 1 : 2));
      let right = Math.min(totalPages - 1, current + (isMobile ? 1 : 2));

      visiblePages.push(1);
      if (left > 2) visiblePages.push("...");
      for (let i = left; i <= right; i++) visiblePages.push(i);
      if (right < totalPages - 1) visiblePages.push("...");
      visiblePages.push(totalPages);
    }
    return visiblePages;
  };

  return (
    <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-4 pt-5">
      {/* Record Info: Smaller text on mobile */}
      <div className="fs-7 fs-md-6 fw-bold text-gray-700 order-2 order-md-1">
        Showing <span className="text-gray-900">{startRecord}</span> to{" "}
        <span className="text-gray-900">{endRecord}</span> of{" "}
        <span className="text-gray-900">{total}</span> records
      </div>

      {/* Pagination Buttons: Flex-nowrap ensures they don't break into two lines */}
      <div className="dt-paging order-1 order-md-2">
        <nav aria-label="pagination">
          <ul className="pagination pagination-outline flex-nowrap mb-0">
            <li className={`page-item previous ${current === 1 ? "disabled" : ""}`}>
              <button
                className="page-link px-3"
                onClick={() => onPageChange(current - 1)}
                disabled={current === 1}
              >
                <i className="fa-solid fa-chevron-left fs-8"></i>
              </button>
            </li>

            {getPaginationNumbers().map((page, index) => (
              <li
                key={index}
                className={`page-item ${page === current ? "active" : ""} ${page === "..." ? "disabled" : ""}`}
              >
                <button
                  className="page-link px-3"
                  onClick={() => page !== "..." && onPageChange(page)}
                  disabled={page === "..."}
                >
                  {page}
                </button>
              </li>
            ))}

            <li className={`page-item next ${current === totalPages ? "disabled" : ""}`}>
              <button
                className="page-link px-3"
                onClick={() => onPageChange(current + 1)}
                disabled={current === totalPages}
              >
                <i className="fa-solid fa-chevron-right fs-8"></i>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Pagination;