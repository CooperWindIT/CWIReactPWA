import React from "react";
import PropTypes from "prop-types";

export default function ViewMoreMachineFailures({ mcnFailObj }) {
    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewMcnFailsData"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) {
                        #offcanvasRightViewMcnFailsData {
                        width: 50% !important;
                        }
                    }
                `}
            </style>

            <form>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Machine Failures</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>

                <div
                    className="offcanvas-body"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingBottom: '2rem',
                        maxHeight: 'calc(100vh - 100px)',
                        marginTop: '-2rem'
                    }}
                >
                    {mcnFailObj?.length === 0 ? (
                        <div className="text-center text-muted py-4">No data available</div>
                    ) : (
                        <>
                            {/* Table view for md and up */}
                            <div className="table-responsive d-none d-md-block">
                                <table className="table table-hover table-bordered table-striped align-middle">
                                    <thead>
                                        <tr className="fw-bold">
                                            <th>#</th>
                                            <th>Machine</th>
                                            <th>No. of Tickets</th>
                                            <th>Department</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mcnFailObj?.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>{item.Col1}</td>
                                                <td className="text-primary fw-bold fs-5">{item.Count}</td>
                                                <td>{item.Col2}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Card view for mobile */}
                            <div className="d-md-none">
                                {mcnFailObj?.map((item, index) => (
                                    <div
                                        key={index}
                                        className="card mb-3 border rounded shadow-sm p-3 bg-light"
                                    >
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong className="text-primary">#{index + 1}</strong>
                                            <span className="badge bg-light-primary">Tickets: {item.Count}</span>
                                        </div>

                                        <div><strong>Machine:</strong> {item.Col1}</div>
                                        <div><strong>Department:</strong> {item.Col2}</div>
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

ViewMoreMachineFailures.propTypes = {
    mcnFailObj: PropTypes.array.isRequired,
};
