import React from "react";
import PropTypes from "prop-types";

export default function ViewMoreTicketsByMonth({ ticketsObj }) {

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewTicketsByMonthData"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
          @media (min-width: 768px) {
            #offcanvasRightViewTicketsByMonthData {
              width: 50% !important;
            }
          }
        `}
            </style>

            <form>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Tickets By Month</h5>
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
                                    <thead className="table-light">
                                        <tr className="fw-bold text-center">
                                            <th>#</th>
                                            <th className="text-start">Department</th>
                                            <th>Raised</th>
                                            <th>Open</th>
                                            <th>Closed</th>
                                            <th>Previous Open</th>
                                            <th>Total Open</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(ticketsObj) &&
                                            ticketsObj?.map((item, index) => (
                                                <tr key={index}>
                                                    <td className='text-'>{index + 1}</td>
                                                    <td className='text-start'>
                                                        {item.Department}
                                                    </td>
                                                    <td className='text-center text-primary fw-bold'>{item.SelectedMonthTicketsRaised}</td>
                                                    <td className='text-center text-warning fw-bold'>
                                                        {item.OpenStatus}
                                                    </td>
                                                    <td className='text-center text-success fw-bold'>
                                                        {item.ClosedStatus}
                                                    </td>
                                                    <td className='text-center text-warning fw-bold'>
                                                        {item.PreviousMonthOpen}
                                                    </td>
                                                    <td className='text-center text-danger fw-bold'>
                                                        {item.TotalOpenTickets}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* CARDS for sm screens */}
                            <div className="d-md-none">
                                {Array.isArray(ticketsObj) &&
                                    ticketsObj.map((item, index) => (
                                        <div
                                            key={index}
                                            className="card mb-3 shadow-sm border-0"
                                        >
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold text-primary">
                                                        #{index + 1}
                                                    </span>
                                                    <span className="badge bg-light text-dark">
                                                        {item.Department}
                                                    </span>
                                                </div>
                                                <div className="row text-center g-2">
                                                    <div className="col-4">
                                                        <div className="small text-muted">Raised</div>
                                                        <div className="fw-bold">
                                                            {item.SelectedMonthTicketsRaised}
                                                        </div>
                                                    </div>
                                                    <div className="col-4">
                                                        <div className="small text-muted">Open</div>
                                                        <div className="fw-bold text-warning">
                                                            {item.OpenStatus}
                                                        </div>
                                                    </div>

                                                    <div className="col-4">
                                                        <div className="small text-muted">Closed</div>
                                                        <div className="fw-bold text-success">
                                                            {item.ClosedStatus}
                                                        </div>
                                                    </div>
                                                    <div className="col-4">
                                                        <div className="small text-muted">Previous Open</div>
                                                        <div className="fw-bold text-success">
                                                            {item.PreviousMonthOpen}
                                                        </div>
                                                    </div>
                                                    <div className="col-4">
                                                        <div className="small text-muted">Both months Open</div>
                                                        <div className="fw-bold text-success">
                                                            {item.TotalOpenTickets}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </>
                    )}
                </div>
            </form >
        </div >
    );
}

ViewMoreTicketsByMonth.propTypes = {
    ticketsObj: PropTypes.array.isRequired,
};
