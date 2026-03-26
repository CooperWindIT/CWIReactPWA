import React, { useMemo } from "react";
import { Chart } from "react-google-charts";

const EmployeeProfileModal = ({ show, handleClose, employee }) => {

  // ✅ Always call hooks first
  const experience = useMemo(() => {
    if (!employee?.joinDate) return 0;
    const start = new Date(employee.joinDate);
    const now = new Date();
    return now.getFullYear() - start.getFullYear();
  }, [employee]);

  if (!employee) return null;

  const skillData = [
    ["Skill", "Level"],
    ...employee.skills.map((skill) => [skill.name, skill.value]),
  ];

  return (
    <>
      {show && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div
              className="modal-content border-0 rounded-4 shadow-lg animate__animated animate__zoomIn"
            >
              <div className="modal-body bg-light p-4 rounded-4">

                {/* Close Button */}
                <button
                  className="btn-close position-absolute end-0 me-3 mt-3"
                  onClick={handleClose}
                ></button>

                {/* HEADER */}
                <div className="text-center mb-4">
                  <img
                    src={employee.image}
                    alt="profile"
                    className="rounded-circle shadow"
                    width="120"
                    height="120"
                    style={{ objectFit: "cover" }}
                  />
                  <h3 className="mt-3 fw-bold text-dark">{employee.label}</h3>
                  <p className="text-muted mb-1">{employee.role}</p>
                  <span className="badge bg-primary px-3 py-2">
                    {experience}+ Years Experience
                  </span>
                </div>

                <div className="row">

                  {/* LEFT SIDE */}
                  <div className="col-md-6">

                    <div className="card shadow-sm border-0 mb-3 rounded-4">
                      <div className="card-body">
                        <h5 className="fw-bold mb-3 text-primary">
                          Personal Information
                        </h5>

                        <p><strong>Email:</strong> {employee.email}</p>
                        <p><strong>Phone:</strong> {employee.phone}</p>
                        <p><strong>Department:</strong> {employee.department}</p>
                        <p><strong>Joined:</strong> {employee.joinDate}</p>
                        <p><strong>Location:</strong> {employee.location}</p>
                      </div>
                    </div>

                    <div className="card shadow-sm border-0 rounded-4">
                      <div className="card-body">
                        <h5 className="fw-bold mb-3 text-success">
                          Current Project
                        </h5>
                        <p><strong>Project:</strong> {employee.project?.name}</p>
                        <p><strong>Role:</strong> {employee.project?.role}</p>
                        <p><strong>Status:</strong> {employee.project?.status}</p>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT SIDE CHART */}
                  <div className="col-md-6">

                    <div className="card shadow-sm border-0 rounded-4">
                      <div className="card-body text-center">
                        <h5 className="fw-bold mb-3 text-warning">
                          Skill Distribution
                        </h5>

                        <Chart
                          chartType="PieChart"
                          data={skillData}
                          width="100%"
                          height="300px"
                          options={{
                            pieHole: 0.4,
                            legend: { position: "bottom" },
                            chartArea: { width: "90%", height: "80%" },
                          }}
                        />
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeProfileModal;
