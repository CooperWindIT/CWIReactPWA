import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import Select from 'react-select';
import { fetchWithAuth } from "../../utils/api";

export default function AddContactorCL({ conObj }) {
  //   console.log(editObj);

  const [sessionUserData, setSessionUserData] = useState([]);
  const [addSubmitLoading, setAddSubmitLoading] = useState(false);
  const [laboursData, setLaboursData] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dateOptions, setDateOptions] = useState([]);
  const [shiftsData, setShiftsData] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [shiftWiseCLData, setShiftWiseCLData] = useState({});
  const [existingDates, setExistingDates] = useState([]);
  const [originalShiftData, setOriginalShiftData] = useState({});

  useEffect(() => {
    const userDataString = sessionStorage.getItem("userData");
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      setSessionUserData(userData);
    } else {
      console.log("User data not found in sessionStorage");
    }
  }, []);

  const fetchData = async () => {
    setDataLoading(true);
    if (conObj && conObj?.Id) {
      try {
        const response = await fetchWithAuth(`contractor/getCLSCountByContractorId?ContractorId=${conObj?.Id}`, {
          method: "GET",
                    headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.ResultData && data.ResultData.length > 0) {
            setLaboursData(data.ResultData);
          } else {
            setLaboursData([]);
            setSelectedDates([]);
            setShiftWiseCLData({});
            setExistingDates([]);
            setOriginalShiftData({});
          }
        } else {
          console.error('Failed to fetch attendance data:', response.statusText);
          setLaboursData([]);
          setSelectedDates([]);
          setShiftWiseCLData({});
          setExistingDates([]);
          setOriginalShiftData({});
        }
      } catch (error) {
        console.error('Error fetching attendance data:', error.message);
        setLaboursData([]);
        setSelectedDates([]);
        setShiftWiseCLData({});
        setExistingDates([]);
        setOriginalShiftData({});
      } finally {
        setDataLoading(false);
      }
    }
  };
  

  useEffect(() => {
    if (conObj && conObj.Id) {
      fetchData();
    }
  }, [conObj.Id]);

  const hasCheckIns = (date) => {
    return (shiftWiseCLData[date] || []).some(shift => shift.CLCheckIns > 0);
  };


  useEffect(() => {
    if (laboursData?.length) {
      const updatedShiftData = {};
      const defaultDates = [];

      laboursData.forEach(entry => {
        const dateKey = new Date(entry.CheckInDate).toISOString().split("T")[0];
        if (!updatedShiftData[dateKey]) {
          updatedShiftData[dateKey] = [];
          defaultDates.push(dateKey);
        }

        updatedShiftData[dateKey].push({
          Id: entry.ShiftTypeId,
          DBId: entry.Id,
          ShiftName: entry.ShiftName,
          StartTime: entry.StartTime,
          EndTime: entry.EndTime,
          CLcount: entry.CLcount,
          isExisting: true,
          CLCheckIns: entry.CLCheckIns,
          ShiftTimes: entry.ShiftTimes,
        });
      });

      setSelectedDates(defaultDates);
      setShiftWiseCLData(updatedShiftData);
      setExistingDates(defaultDates);
      const originalDataCopy = {};
      // console.log(updatedShiftData)

      defaultDates.forEach(date => {
        originalDataCopy[date] = updatedShiftData[date].map(shift => ({ ...shift }));
      });

      setOriginalShiftData(originalDataCopy);
    }
  }, [laboursData]);

  const hasCLCountChanged = (date) => {
    const original = originalShiftData[date] || [];
    const current = shiftWiseCLData[date] || [];

    if (original.length !== current.length) return true;

    return current.some((shift, i) => shift.CLcount !== original[i]?.CLcount);
  };


  const isUpdateEmail = (date) => {
    if (!laboursData || !Array.isArray(laboursData)) return false;

    // Normalize incoming date to YYYY-MM-DD
    const targetDate = new Date(date).toISOString().split('T')[0];

    // Filter items for the given date
    const dateData = laboursData.filter(item => {
      const itemDate = new Date(item.CheckInDate).toISOString().split('T')[0];
      return itemDate === targetDate;
    });

    // Check if ANY of them has NotifiedCLCount > 0
    return dateData.some(item => item.NotifiedCLCount > 0);
  };

  const fetchShiftsData = async () => {
    try {
      if (sessionUserData.OrgId) {
        const response = await fetchWithAuth(`contractor/getShiftTimings?OrgId=${sessionUserData.OrgId}`, {
          method: "GET",
                    headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          setShiftsData(data.ResultData);
        } else {
          console.error('Failed to fetch shifts data:', response.statusText);
        }
      }
    } catch (error) {
      console.error('Error fetching shifts data:', error.message);
    }
  };

  useEffect(() => {
    if (sessionUserData.OrgId) {
      fetchShiftsData();
    }
  }, [sessionUserData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allCLData = Object.entries(shiftWiseCLData).flatMap(([date, shifts]) =>
      shifts.map(shift => ({
        Id: shift.DBId || 0,
        ContractorId: conObj?.Id,
        CLcount: parseInt(shift.CLcount || 0),
        CheckInDate: date,
        CLCheckIns: shift.CLCheckIns,
        IsActive: 1,
        ShiftTypeId: shift.Id
      }))
    );
    
    const payload = {
      orgid: sessionUserData?.OrgId,
      userid: sessionUserData?.Id,
      ContractorId: conObj?.Id,
      CLCountData: allCLData
    };
    
    const totalCLSum = allCLData.reduce((sum, item) => sum + item.CLcount, 0);
    
    if (allCLData.length === 0 || totalCLSum === 0) {
      Swal.fire({
        title: "No Data Entered",
        text: "Please choose dates and add a CL count greater than zero before submitting.",
        icon: "info",
        confirmButtonColor: "#3085d6"
      });
      return; // Stop the function here
    }
    
    setAddSubmitLoading(true);
    try {
      const response = await fetchWithAuth(`contractor/ManageCLCount`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        if (result.data.result[0].Success === 1) {
          setAddSubmitLoading(false);
          Swal.fire({
            title: "Success",
            text: "CL count updated successfully!",
            icon: "success"
          }).then(() => {
            fetchData();
          })
        }
        else if (result.data.result[0].ResponseCode === 4000) {
          setAddSubmitLoading(false);
          Swal.fire({
            title: "Configuration Required",
            html: `
                <div class="text-start">
                    <p><strong>Action Needed:</strong> Before updating the CL count, please ensure the <b>working days</b> are configured for the selected month.</p>
                    <p class="text-muted small">Please navigate to the Working Days Screen to add the working days first.</p>
                </div>
            `,
            icon: "warning",
            confirmButtonText: `<i class="bi bi-hand-thumbs-up me-1 text-white"></i>I Understand`,
            confirmButtonColor: "#f8bb86" // Warning orange
        })}
      } else {
        setAddSubmitLoading(false);
        Swal.fire("Error", result?.message || "Failed to add CL count!", "error");
      }
    } catch (error) {
      setAddSubmitLoading(false);
      console.error("Error submitting form:", error);
      Swal.fire("Error", "Something went wrong!", "error");
    }
  };

  const handleNotifyEmail = async (date) => {
    const isRevised = isUpdateEmail(date) ? 1 : 0;
    try {
      const response = await fetchWithAuth(`contractor/NotifyCLCount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          UserId: sessionUserData?.Id,
          OrgId: sessionUserData?.OrgId,
          ContractorId: conObj?.Id,
          CheckInDate: date,
          IsRevised: isRevised
        })
      });

      const result = await response.json();

      if (result.data.result[0].Success === 1) {
        Swal.fire("Success", "Email sent successfully", "success");
        fetchData();
      } else {
        Swal.fire("Error", result?.message || "Failed to send email", "error");
      }
    } catch (error) {
      console.error("Notify Email Error:", error);
      Swal.fire("Error", "An error occurred while sending email", "error");
    }
  };

  const handleDeleteDate = async (date) => {
    const shiftData = shiftWiseCLData[date];

    // Extract all valid (non-zero) IDs
    const idsToDelete = shiftData
      .map(shift => shift.DBId)
      .filter(id => id !== 0); // Only existing entries should be deleted via API

    if (idsToDelete.length === 0) {
      Swal.fire("Info", "No existing data to delete for this date.", "info");
      return;
    }

    try {
      const response = await fetchWithAuth(`contractor/InactiveCLDate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Id: idsToDelete.join(","), // Comma-separated Ids
          UserId: sessionUserData?.Id, // Replace with actual user ID
        }),
      });

      const result = await response.json();

      if (response.ok && result?.ResultData?.Status === 'Success') {
        Swal.fire("Deleted!", "Date data has been deleted successfully.", "success");

        // Remove the deleted date from UI
        setSelectedDates(prev => prev.filter(d => d !== date));
        setShiftWiseCLData(prev => {
          const updated = { ...prev };
          delete updated[date];
          return updated;
        });
      } else {
        Swal.fire("Error", result?.ResultData?.ResultMessage || "Failed to delete the data.", "error");
      }
    } catch (error) {
      console.error("Delete Date Error:", error);
      Swal.fire("Error", "An error occurred while deleting the date.", "error");
    }
  };

  const generateDateOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 4; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      options.push(nextDate.toISOString().split("T")[0]);
    }
    return options;
  };

  useEffect(() => {
    const dates = generateDateOptions();
    setDateOptions(dates);
  }, []);

  const options = dateOptions?.map(date => ({ value: date, label: date }));

  const isShiftLocked = (shift, date) => {
    const [hours, minutes] = new Date(shift.StartTime)
      .toISOString()
      .substring(11, 16)
      .split(":")
      .map(Number);
  
    const selectedDate = new Date(date);
  
    const shiftDateTime = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes,
      0
    );
  
    const lockTime = new Date(shiftDateTime.getTime() + 60 * 60 * 1000); // +1 hour
    const now = new Date();
  
    // console.log("Shift Name:", shift.ShiftName);
    // console.log("Shift Time:", shiftDateTime.toLocaleString());
    // console.log("Lock After:", lockTime.toLocaleString());
    // console.log("Now:", now.toLocaleString());
    // console.log("Locked?", now >= lockTime);
  
    return now >= lockTime;
  };

  return (
    <div
      className="offcanvas offcanvas-end"
      tabIndex="-1"
      id="offcanvasRightAddCL"
      aria-labelledby="offcanvasRightLabel"
      style={{ width: '90%' }}
    >
      <style>
        {`
          @media (min-width: 768px) { /* Medium devices and up (md) */
              #offcanvasRightAddCL {
                  width: 50% !important;
              }
          }
        `}
      </style>

      <form onSubmit={handleSubmit}>
        <div className="offcanvas-header d-flex justify-content-between align-items-center mb-1">
          <h5 id="offcanvasRightLabel" className="mb-0">Add CL Count</h5>
          <div className="d-flex align-items-center">
            <button
              className="btn btn-primary me-2 btn-sm"
              type="submit"
              disabled={
                addSubmitLoading 
                // (sessionUserData.RoleId !== 1 && sessionUserData.RoleId !== 2)
              }
            >
              <i className="bi bi-bookmark-check"></i>{addSubmitLoading ? "Updating..." : "Update"}
            </button>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
              onClick={() => {
                const filteredData = {};
                existingDates.forEach(date => {
                  if (shiftWiseCLData[date]) {
                    filteredData[date] = shiftWiseCLData[date];
                  }
                });

                setSelectedDates(existingDates);
                setShiftWiseCLData(filteredData);
              }}
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
          <div className="row">
            <div className="card p-3 shadow-sm border-0">
              <div className="card-body">
                <h5 className="card-title text-primary fw-bold">Agency Details</h5>
                <hr />
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Agency Name</label>
                    <div className="bg-light p-2 rounded text-dark fw-medium">
                      {conObj?.ContractorName || "N/A"}
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-semibold">Agency Mobile No</label>
                    <div className="bg-light p-2 rounded text-dark fw-medium">
                      {conObj?.PhoneNumber || "N/A"}
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label fw-semibold">Agency Email</label>
                    <div className="bg-light p-2 rounded text-dark fw-medium">
                      {conObj?.Email || "N/A"}
                    </div>
                  </div>
                </div>

              </div>
            </div>
            <div className="d-flex flex-wrap align-items-center mt-3 gap-2">
              <h6 className="mb-0">Dates:</h6>
              <div style={{ minWidth: '220px', flexGrow: 1 }}>
                <Select
                  isMulti
                  options={options}
                  value={options.filter(opt => selectedDates.includes(opt.value))}
                  onChange={(selectedOptions) => {
                    const selected = selectedOptions.map(opt => opt.value);
                    setSelectedDates(selected);
                    setShiftWiseCLData(prev => {
                      const updated = { ...prev };
                      selected.forEach(date => {
                        if (!updated[date]) {
                          updated[date] = shiftsData.map(shift => ({
                            ...shift,
                            CLcount: 0,
                            isExisting: false
                          }));
                        }
                      });
                      return updated;
                    });
                  }}
                  styles={{
                    container: base => ({ ...base, width: '100%' }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  onKeyDown={(e) => e.preventDefault()}
                />
              </div>
            </div>

            {dataLoading ? (
              <div className="text-center my-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              selectedDates?.map(date => (
                shiftWiseCLData[date] && (
                  <div key={date} className="mt-4 border p-3 rounded bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0 fw-bold text-primary">
                        {new Date(date).toLocaleDateString('en-GB')}
                      </h6>

                      <div className="d-flex gap-2">
                        {existingDates.includes(date) && (
                          <button
                            type="button"
                            className={`badge badge-light-${isUpdateEmail(date) ? 'warning' : 'primary'} border-0`}
                            title={hasCLCountChanged(date) ? "Save changes before sending email." : ""}
                            onClick={() => handleNotifyEmail(date)}
                            disabled={addSubmitLoading || hasCLCountChanged(date)}
                          >
                            {isUpdateEmail(date) ? "Update Email" : "Send Email"}
                            <i className="fa-solid fa-paper-plane ms-1"></i>
                          </button>

                        )}

                        {(!existingDates.includes(date)) && (
                          <button
                            className="btn btn-sm btn-secondary btn-sm"
                            type="button"
                            onClick={() => {
                              setSelectedDates(prev => prev.filter(d => d !== date));
                              setShiftWiseCLData(prev => {
                                const updated = { ...prev };
                                delete updated[date];
                                return updated;
                              });
                            }}
                            disabled={addSubmitLoading}
                          >
                            Clear Date <i className="fa-solid fa-xmark ms-1"></i>
                          </button>
                        )}

                        {existingDates.includes(date) && (
                          <button
                            className="badge badge-light-danger border-0"
                            type="button"
                            onClick={() => {
                              Swal.fire({
                                title: "Are you sure?",
                                text: "This will delete all shifts for the selected date.",
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonText: "Yes, delete it!",
                              }).then((result) => {
                                if (result.isConfirmed) {
                                  handleDeleteDate(date);
                                }
                              });
                            }}
                            disabled={addSubmitLoading || hasCheckIns(date)}
                            title={hasCheckIns(date) ? "Cannot delete - CL Check-Ins present" : ""}
                          >
                            Delete Date <i className="fa-regular fa-trash-can ms-1"></i>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-bordered table-sm text-nowrap">
                        <thead className="table-light">
                          <tr>
                            <th>#</th>
                            <th>Shift</th>
                            <th>Times</th>
                            <th>CL Check-In's</th>
                            <th>CL Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shiftWiseCLData[date].map((shift, idx) => (
                            <tr key={shift.Id}>
                              <td>{idx + 1}</td>
                              <td>{shift.ShiftName}</td>
                              <td>{shift.ShiftTimes || 'N/A'}</td>
                              <td>{shift.CLCheckIns}</td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={shift.CLcount}
                                  min={0}
                                  // disabled={shift.CLCheckIns > 0 || isShiftLocked(shift, date) || sessionUserData.RoleId !== 1 || sessionUserData.RoleId !== 2}
                                  disabled={
                                    shift.CLCheckIns > 0 ||
                                    isShiftLocked(shift, date) 
                                  }                                  
                                  onChange={(e) => {
                                    const value = Math.max(0, parseInt(e.target.value || 0));
                                    setShiftWiseCLData(prev => {
                                      const updatedShifts = [...prev[date]];
                                      updatedShifts[idx] = {
                                        ...updatedShifts[idx],
                                        CLcount: value
                                      };
                                      return { ...prev, [date]: updatedShifts };
                                    });
                                  }}
                                  style={{ maxWidth: '5rem' }}
                                  onWheel={(e) => e.target.blur()}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                )
              ))
            )}

          </div>
        </div>
      </form>
    </div>
  );
}

AddContactorCL.propTypes = {
  conObj: PropTypes.object.isRequired,
};
