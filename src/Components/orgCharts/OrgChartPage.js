import React from "react";
import OrgCharts from "./org";

function OrgChartPage() {
    return (
        <div className="container-fluid mt-3">
            <h3 className="mb-3">Organization Structure</h3>
            <div className="card shadow" style={{ height: "80vh" }}>
                <div className="card-body p-0">
                    <OrgCharts />
                </div>
            </div>
        </div>
    );
}

export default OrgChartPage;
