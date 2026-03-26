import React from "react";
import PropTypes from "prop-types";

export default function ViewMoreOpenTickets({ ticketsObj }) {

    const getBadgeClass = (status) => {
        switch (status) {
            case "NEW":
                return "badge-light-primary";
            case "APPROVED":
            case "REQ APPROVED":
                return "badge-light-success";
            case "ASSIGNED":
                return "badge-light-info";
            case "REQ APPROVAL":
                return "badge-light-warning";
            case "FILEUPLOAD":
                return "badge-light-dark";
            case "RESOLVED":
                return "badge-light-success";
            case "CLOSED":
                return "badge-light-danger";
            default:
                return "badge-light";
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewOpenTicketsData"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
          @media (min-width: 768px) {
            #offcanvasRightViewOpenTicketsData {
              width: 50% !important;
            }
          }
        `}
            </style>

            <form>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Open Tickets</h5>
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
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                    maxHeight: 'calc(100vh - 100px)',
                    marginTop: '-2rem'
                }}>
                    {/* No data case */}
                    {ticketsObj?.length === 0 ? (
                        <div className="text-center text-muted py-4">No data available</div>
                    ) : (
                        <>
                            {/* TABLE for md+ screens */}
                            <div className="table-responsive d-none d-md-block">
                                <table className="table table-hover table-bordered table-striped align-middle">
                                    <thead>
                                        <tr className='fw-bold'>
                                            <th>#</th>
                                            <th>Machine</th>
                                            <th>Ticket Code</th>
                                            <th>Raised By</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ticketsObj?.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>{item.Label}</td>
                                                <td>{item.Col1}</td>
                                                <td>{item.Col3}</td>
                                                <td>
                                                    <span className={`badge ${getBadgeClass(item.Col5)}`}>
                                                        {item.Col5}
                                                    </span>
                                                </td>
                                                <td>{item.Col4}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* CARDS for sm screens */}
                            <div className="d-md-none">
                                {ticketsObj?.map((item, index) => (
                                    <div key={index} className="card mb-3 border rounded shadow-sm p-3 bg-light">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong className="text-primary">#{index + 1}</strong>
                                            <span className={`badge ${getBadgeClass(item.Col5)}`}>{item.Col5}</span>
                                        </div>

                                        <div><strong>Machine:</strong> {item.Label}</div>
                                        <div><strong>Ticket Code:</strong> {item.Col1}</div>

                                        <div className="d-flex justify-content-between mt-2">
                                            <div><strong>Date:</strong> {item.Col4}</div>
                                            <div><strong>Raised By:</strong> {item.Col3}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
}

ViewMoreOpenTickets.propTypes = {
    ticketsObj: PropTypes.array.isRequired,
};
