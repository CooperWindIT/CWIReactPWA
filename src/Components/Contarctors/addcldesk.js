import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import { VMS_URL_CONTRACTOR } from "../Config/Config";
import Select from 'react-select';

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
        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}getCLSCountByContractorId?ContractorId=${conObj?.Id}`);
            if (response.ok) {
                const data = await response.json();
                setLaboursData(data.ResultData);
                console.log(data);
            } else {
                setDataLoading(false);
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            setDataLoading(false);
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (conObj.Id) {
            fetchData();
        }
    }, [conObj]);

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
                    DBId: entry.Id, // Add the real DB ID for submission
                    ShiftName: entry.ShiftName,
                    StartTime: entry.StartTime,
                    EndTime: entry.EndTime,
                    CLcount: entry.CLcount,
                    isExisting: true,
                    CLCheckIns: entry.CLCheckIns
                });
            });

            setSelectedDates(defaultDates);
            setShiftWiseCLData(updatedShiftData);
        }
    }, [laboursData]);

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
                const response = await fetch(`${VMS_URL_CONTRACTOR}getShiftTimings?OrgId=${sessionUserData.OrgId}`);
                if (response.ok) {
                    const data = await response.json();
                    setShiftsData(data.ResultData);
                    // console.log(data.ResultData);
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
        setAddSubmitLoading(true);
        const allCLData = Object.entries(shiftWiseCLData).flatMap(([date, shifts]) =>
            shifts.map(shift => ({
                Id: shift.DBId || 0,
                ContractorId: conObj?.Id,
                CLcount: parseInt(shift.CLcount || 0),
                CheckInDate: date,
                CLCheckIns: 0,
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
        // console.log('ManageCLCount', payload);

        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}ManageCLCount`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            console.log(result);

            if (response.ok) {
                if (result.data.result[0].Success === 1) {
                    setAddSubmitLoading(false);
                    Swal.fire({
                        title: "Success",
                        text: "Labour added successfully!",
                        icon: "success"
                    }).then(() => {
                        window.location.reload();
                    });
                }
            } else {
                setAddSubmitLoading(false);
                Swal.fire("Error", result?.message || "Failed to add labour!", "error");
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
            const response = await fetch(`${VMS_URL_CONTRACTOR}NotifyCLCount`, {
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
        console.log(shiftData)
      
        // Extract all valid (non-zero) IDs
        const idsToDelete = shiftData
          .map(shift => shift.DBId)
          .filter(id => id !== 0); // Only existing entries should be deleted via API
      
        if (idsToDelete.length === 0) {
          Swal.fire("Info", "No existing data to delete for this date.", "info");
          return;
        }
      
        try {
          const response = await fetch(`${VMS_URL_CONTRACTOR}InactiveCLDate`, {
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
      
          if (response.ok && result?.output?.Status === "Success") {
            Swal.fire("Deleted!", "Date data has been deleted successfully.", "success");
      
            // Remove the deleted date from UI
            setSelectedDates(prev => prev.filter(d => d !== date));
            setShiftWiseCLData(prev => {
              const updated = { ...prev };
              delete updated[date];
              return updated;
            });
          } else {
            Swal.fire("Error", result?.message || "Failed to delete the data.", "error");
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

    const formatTimeUTCAmPm = (isoString) => {
        const date = new Date(isoString);
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHour = (hours % 12 || 12).toString().padStart(2, '0');
        return `${displayHour}:${minutes} ${ampm}`;
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAddCL"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: '75%' }}
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
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Request Contracting Agency</h5>
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-primary me-2"
                            type="submit"
                            disabled={addSubmitLoading}
                        >
                            {addSubmitLoading ? "Updating..." : "Update"}
                        </button>
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
                    <div className="row">
                        <div className="card p-3 shadow-sm border-0">
                            <div className="card-body">
                                <h5 className="card-title text-primary fw-bold">Agency Details</h5>
                                <hr />
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Agency Name</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.ContractorName || "N/A"}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Agency Mobile No</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.PhoneNumber || "N/A"}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Agency Email</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.Email || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex mt-3">
                            <h6 className="text-start mt-1">Labour List:</h6>
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
                                    container: base => ({ ...base, width: '16rem', marginLeft: 'auto' }),
                                    menuPortal: base => ({ ...base, zIndex: 9999 })
                                }}
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                            />
                        </div>
                        {selectedDates?.map(date => (
                            shiftWiseCLData[date] && (
                                <div key={date} className="mt-4 border p-3 rounded bg-light">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="mb-0 fw-bold text-primary">
                                            {new Date(date).toLocaleDateString('en-GB')}
                                        </h6>

                                        <div className="d-flex gap-2">
                                            <button
                                                className={`btn btn-sm btn-info ${sessionUserData.Id === 1 || sessionUserData.Id === 2 ? 'd-block' : 'd-none'}`}
                                                type="button"
                                                onClick={() => handleNotifyEmail(date)}
                                                disabled={addSubmitLoading}
                                            >
                                                {isUpdateEmail(date) ? "Update Email" : "Send Email"}
                                                <i className="fa-solid fa-paper-plane ms-1"></i>
                                            </button>

                                            <button
                                                className={`btn btn-sm btn-secondary ${sessionUserData.Id === 1 || sessionUserData.Id === 2 ? 'd-block' : 'd-none'}`}
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
                                            <button
                                                className={`btn btn-sm btn-danger ${sessionUserData.Id === 1 ? 'd-block' : 'd-none'}`}
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
                                                disabled={addSubmitLoading}
                                            >
                                                Delete Date <i className="fa-regular fa-trash-can ms-1"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table table-bordered">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Shift</th>
                                                    <th>Start</th>
                                                    <th>End</th>
                                                    <th>CL Check-In's</th>
                                                    <th>CL Count</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {shiftWiseCLData[date].map((shift, idx) => (
                                                    <tr key={shift.Id}>
                                                        <td>{idx + 1}</td>
                                                        <td>{shift.ShiftName}</td>
                                                        <td>{formatTimeUTCAmPm(shift.StartTime)}</td>
                                                        <td>{formatTimeUTCAmPm(shift.EndTime)}</td>
                                                        <td>{shift.CLCheckIns}</td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                className="form-control"
                                                                value={shift.CLcount}
                                                                onChange={(e) => {
                                                                    const value = parseInt(e.target.value || 0);
                                                                    setShiftWiseCLData(prev => {
                                                                        const updatedShifts = [...prev[date]];
                                                                        updatedShifts[idx] = {
                                                                            ...updatedShifts[idx],
                                                                            CLcount: value
                                                                        };
                                                                        return { ...prev, [date]: updatedShifts };
                                                                    });
                                                                }}
                                                                style={{ width: '6rem' }}
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
                        ))}
                    </div>
                </div>
            </form>
        </div>
    );
}

AddContactorCL.propTypes = {
    conObj: PropTypes.object.isRequired,
};
