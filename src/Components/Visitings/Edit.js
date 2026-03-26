import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Swal from 'sweetalert2';
import axios from 'axios';
import { Select } from "antd";
import { fetchWithAuth } from "../../utils/api";


export default function EditPass({ passObj }) {

    const [sessionUserData, setsessionUserData] = useState([]);
    const [viewLoading, setViewLoading] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    const [attendeesData, setAttendeesData] = useState([]);
    const [Dep, setDep] = useState([]);
    const [errors, setErrors] = useState({});
    const [emailErrors, setEmailErrors] = useState({});
    const [visitorType, setVisitorType] = useState(null);
    const [visitorTypesData, setVisitorTypesData] = useState([]);
    const [showAllTypes, setShowAllTypes] = useState(false);
    const [unitsData, setUnitsData] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const { Option, OptGroup } = Select;

    const [editData, setEditData] = useState({
        "orgid": sessionUserData.OrgId,
        "userid": 1,
        "Operation": "EDIT",
        "RequestPass": {
            "RequestId": "",
            "RequestDate": "",
            'MeetingDate': "",
            'MeetingTime': "",
            'ExpiryDate': "",
            "Remarks": "",
            "VisitorType": "",
            "Status": "",
            "AutoIncNo": "",
            "UnitId": "",
        },
        "Attendees": []
    });

    useEffect(() => {
        setEditData((prevData) => ({
            ...prevData,
            orgid: sessionUserData.OrgId,
            userid: sessionUserData.UserId,
            Operation: "EDIT",
            RequestPass: {
                RequestId: passObj?.RequestId,
                RequestDate: passObj?.RequestDate,
                MeetingDate: passObj?.MeetingDate ? passObj.MeetingDate.split('T')[0] : "",
                MeetingTime: passObj?.MeetingTime ? passObj.MeetingTime.split('T')[1].split('.')[0] : "",
                ExpiryDate: passObj?.ExpiryDate ? passObj.ExpiryDate.split('T')[0] : null,
                Remarks: passObj?.Remarks,
                VisitorType: passObj?.VisitorType,
                Status: 'DRAFT',
                AutoIncNo: passObj?.AutoIncNo,
                UnitId: passObj?.UnitId
            },
            Attendees: prevData.Attendees.length > 0 ? prevData.Attendees : passObj?.Attendees || []
        }));
    }, [passObj, sessionUserData]);

    const fetchUnits = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`, {
                method: "GET",
                    headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");
            
            const data = await response.json();
            
            const filteredData = data.ResultData.filter(
                (item) => item.DDLName === "UnitLocations"
            );
            
            setUnitsData(filteredData);
        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
        }
    }

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchUnits();
        }
    }, [sessionUserData]);

    const fetchDep = async () => {
        try {
            if (sessionUserData.OrgId) {
                const depResponse = await fetchWithAuth(`auth/getDepts?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                const vTypesResponse = await fetchWithAuth(`visitor/VisitorTypesByOrgId?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (depResponse.ok || vTypesResponse) {
                    const depData = await depResponse.json();
                    const vTypesData = await vTypesResponse.json();
                    setDep(depData.ResultData);
                    setVisitorTypesData(vTypesData.ResultData);
                } else {
                    console.error('Failed to fetch shifts data:', depResponse.statusText);
                }
            }
        } catch (error) {
            console.error('Error fetching shifts data:', error.message);
        }
    };

    const validVisitorTypes = Array.isArray(visitorTypesData) ? visitorTypesData : [];

    const topThreeTypes = validVisitorTypes.slice(0, 3);
    const otherTypes = validVisitorTypes.slice(3);
    const selectedType = editData?.RequestPass?.VisitorType;
    

    const [searchText, setSearchText] = useState('');
    const [filteredTop, setFilteredTop] = useState(topThreeTypes);
    const [filteredOther, setFilteredOther] = useState(otherTypes);

    useEffect(() => {
        if (otherTypes.some(t => t.Id === selectedType)) {
            setShowAllTypes(true);
        }
    }, [selectedType, otherTypes]);

    useEffect(() => {
        const filterList = (list) =>
            list.filter((type) =>
                type.TypeName.toLowerCase().includes(searchText.toLowerCase())
            );

        setFilteredTop(filterList(topThreeTypes));
        setFilteredOther(filterList(otherTypes));
    }, [searchText, visitorTypesData]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDep();
        }
    }, [sessionUserData]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem('userData');
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        } else {
            console.log('User data not found in sessionStorage');
        }
    }, []);

    const fetchViewEditData = async () => {
        setViewLoading(true);
        if (passObj === null || passObj === undefined) return;
        try {
            const response = await fetchWithAuth(`visitor/getReqPassById?RequestId=${passObj.RequestId}`, {
                method: "GET",
                    headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                const attendeesWithDefaults = data.ResultData.map(attendee => ({
                    Id: attendee.Id || "",
                    Name: attendee.Name || "",
                    Email: attendee.Email || "",
                    Mobile: attendee.Mobile || "",
                    CompanyName: attendee.CompanyName || "",
                    Designation: attendee.Designation || "",
                    IsVehicle: attendee.IsVehicle ?? 0,
                    VehicleInfo: attendee.VehicleInfo || "",
                    DeptId: attendee.DeptId || "",
                    Notify: attendee.Notify || 0
                }));

                const fetchedVisitorType = data?.ResultData[0].VisitorType;

                setAttendeesData(attendeesWithDefaults);
                setVisitorType(fetchedVisitorType);
                setEditData((prevData) => ({
                    ...prevData,
                    Attendees: attendeesWithDefaults
                }));

                // Checking if visitor type is in "otherTypes" and show them
                const isInOtherTypes = visitorTypesData.slice(3).some(type => type.Id === fetchedVisitorType);
                if (isInOtherTypes) {
                    setShowAllTypes(true);
                }

            } else {
                console.error('Failed to fetch attendees data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendees data:', error.message);
        } finally {
            setViewLoading(false);
        }
    };

    useEffect(() => {
        fetchViewEditData();
    }, [passObj.RequestId]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "MeetingTime") {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 5);
            const selectedDate = editData.RequestPass.MeetingDate;
            const today = now.toISOString().split("T")[0];

            if (selectedDate === today && value < currentTime) {
                alert("Please select a future time.");
                return;
            }
        }

        if (name === "VisitorType") {
            const visitorType = parseInt(value);

            setEditData((prev) => ({
                ...prev,
                RequestPass: {
                    ...prev.RequestPass,
                    VisitorType: visitorType,
                    ExpiryDate: visitorType === 3
                        ? prev.RequestPass.ExpiryDate || ''
                        : null,
                },
            }));
        } else {
            setEditData((prev) => ({
                ...prev,
                RequestPass: {
                    ...prev.RequestPass,
                    [name]: value,
                },
            }));
        }
    };

    const handleAddAttendee = () => {
        setEditData((prevData) => ({
            ...prevData,
            Attendees: [
                ...(prevData.Attendees || []), // Ensure Attendees array exists
                {
                    Id: 0,
                    Name: "",
                    Email: "",
                    Mobile: "",
                    CompanyName: "",
                    Designation: "",
                    IsVehicle: 0,
                    VehicleInfo: "",
                    DeptId: "",
                    Notify: 1
                }
            ]
        }));
    };

    const handleAttendeeChange = (index, key, value) => {
        setEmailErrors({});
        if (key === 'Mobile') {
            // Allow only numbers and ensure a maximum of 10 digits
            if (!/^\d{0,10}$/.test(value)) {
                Swal.fire({
                    title: "Invalid Input",
                    text: "Please enter a valid 10-digit mobile number without letters or special characters.",
                    icon: "error",
                });
                return;
            }
        }
        setEditData((prevData) => {
            const updatedAttendees = [...prevData.Attendees];

            if (!updatedAttendees[index]) {
                updatedAttendees[index] = {
                    Id: "",
                    Name: "",
                    Email: "",
                    Mobile: "",
                    CompanyName: "",
                    Designation: "",
                    IsVehicle: 0,
                    VehicleInfo: "",
                    DeptId: "",
                    Notify: 0
                };
            }

            updatedAttendees[index][key] = value;

            return { ...prevData, Attendees: updatedAttendees };
        });
    };

    const validateForm = () => {
        const newErrors = {};

        editData.Attendees.forEach((attendee, index) => {
            if (!attendee.Name) newErrors[`Name-${index}`] = "Name is required.";
            //   if (!attendee.Mobile) newErrors[`Mobile-${index}`] = "Phone is required.";
            //   else if (!/^\d{10}$/.test(attendee.Mobile)) newErrors[`Mobile-${index}`] = "Enter a valid 10-digit phone number.";
            // if (!attendee.Email) newErrors[`Email-${index}`] = "Email is required.";
            // else if (!/\S+@\S+\.\S+/.test(attendee.Email)) newErrors[`Email-${index}`] = "Enter a valid email.";
            if (!attendee.CompanyName) newErrors[`CompanyName-${index}`] = "Company Name is required.";
            if (!attendee.DeptId) newErrors[`DeptId-${index}`] = "Department is required.";
            if (!attendee.Designation) newErrors[`Designation-${index}`] = "Designation is required.";
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.(com|in|gov|tech|info|org|net|us|edu|shop|dev)$/i;
        return regex.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        let hasInvalidEmail = false;
        const newEmailErrors = {};

        editData.Attendees.forEach((attendee, index) => {
            if (attendee.Email) {

                if (!validateEmail(attendee.Email)) {
                    newEmailErrors[index] = 'Please enter a valid email ending with .com or .in';
                    hasInvalidEmail = true;
                }
            }
        });

        setEmailErrors(newEmailErrors);

        if (hasInvalidEmail) {
            setEditLoading(false);
            return;
        }

        if (!editData?.RequestPass?.UnitId) {
            Swal.fire({
                title: 'Error',
                text: 'Please choose unit.',
                icon: 'error',
            });
            setEditLoading(false);
            return;
        }

        if (!editData?.RequestPass?.MeetingDate) {
            Swal.fire({
                title: 'Error',
                text: 'Please choose meeting date.',
                icon: 'error',
            });
            setEditLoading(false);
            return;
        }

        if (editData?.RequestPass?.VisitorType === 3 && !editData?.RequestPass?.ExpiryDate) {
            Swal.fire({
                title: 'Error',
                text: 'Please choose expiry date.',
                icon: 'error',
            });
            setEditLoading(false);
            return;
        }

        if (editData?.RequestPass?.ExpiryDate <= editData?.RequestPass?.MeetingDate) {
            Swal.fire({
                title: 'Error',
                text: 'Please choose expiry date above the meeting date.',
                icon: 'error',
            });
            setEditLoading(false);
            return;
        }

        if (!validateForm()) {
            Swal.fire({
                title: 'Error',
                text: 'Please fill all required fields correctly.',
                icon: 'error',
            });
            setEditLoading(false);
            return;
        }

        for (let i = 0; i < editData.Attendees.length; i++) {
            const mobile = editData.Attendees[i].Mobile;
            if (mobile && !/^\d{10}$/.test(mobile)) {
                Swal.fire({
                    title: "Invalid Mobile Number",
                    text: `Attendee ${i + 1}: Mobile number must be exactly 10 digits.`,
                    icon: "error",
                });
                setEditLoading(false);
                return;
            }
        }

        if (editData.Attendees.length === 0) {
            Swal.fire({
                title: 'Error',
                text: 'Please add atleast one attendee.',
                icon: 'error',
            });
            setEditLoading(false);
            return;
        }

        try {
            const payload = {
                ...editData,
                orgid: sessionUserData?.OrgId,
                userid: sessionUserData?.Id,
            };

            setEditLoading(true);

            const response = await fetchWithAuth(`visitor/ManageVisitorsPass`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (response.ok) {
                if (result.data.result[0]?.Success === 1) {
                    Swal.fire({
                        title: 'Success',
                        text: 'The record has been updated successfully.',
                        icon: 'success',
                    }).then(() => window.location.reload());
                }
            }
            else {
                console.error("Edit failed:", response.statusText);
            }
        } catch (error) {
            console.error("Error submitting data:", error.message);
        } finally {
            setEditLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const handleDeleteAttendee = async (attendee, index) => {
        if (!attendee.Id) {
          // If attendee not saved in DB yet, just remove locally
          setEditData((prev) => {
            const updated = [...prev.Attendees];
            updated.splice(index, 1);
            return { ...prev, Attendees: updated };
          });
          return;
        }
      
        try {
          const response = await fetchWithAuth(`visitor/AttendeInActive`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              UserId: sessionUserData.Id,
              AttendeId: attendee.Id,
            }),
          });
      
          const data = await response.json();
      
          if (response.ok && data.ResultData?.Status === "Success") {
            await fetchViewEditData();
      
            setEditData((prev) => {
              const updated = [...prev.Attendees];
              updated.splice(index, 1);
              return { ...prev, Attendees: updated };
            });
          } else {
            console.error("Failed to delete attendee:", data);
            Swal.fire(
              "Error",
              data.ResultData?.ResultMessage || "Failed to delete attendee.",
              "error"
            );
          }
        } catch (error) {
          console.error("Error deleting attendee:", error);
          Swal.fire("Error", "Error occurred while deleting attendee.", "error");
        }
      };      

    const toTitleCase = (str) => {
        return str.replace(/\w\S*/g, (txt) =>
            txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
        );
    };
    const sanitizeNameInput = (value) => {
        const cleaned = value.replace(/[^a-zA-Z.\s]/g, "");
        return toTitleCase(cleaned);
    };

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);


    return (
        <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasRightEdit" aria-labelledby="offcanvasRightLabel"
            style={{ width: '90%' }}
        >
            <style>
                {`
                    #offcanvasRightEdit {
                    width: 90%; /* Default for mobile devices */
                    }

                    @media (min-width: 768px) {  
                    #offcanvasRightEdit {
                        width: 50% !important; /* Medium screens and up */
                    }
                    }

                    @media (min-width: 1200px) {  
                    #offcanvasRightEdit {
                        width: 45% !important; /* Even narrower for large desktops if needed */
                    }
                    }
                `}
            </style>
            <div className="offcanvas-header d-flex justify-content-between align-items-center">
                <h5 id="offcanvasRightLabel" className="mb-0">Edit Visit<span className="ms-1 text-primary">({editData?.RequestPass?.AutoIncNo})</span></h5>
                <div className="d-flex align-items-center">
                    <button
                        className="btn btn-primary btn-sm me-2 mb-3"
                        type="button"
                        onClick={(e) => handleSubmit(e)}
                    >
                        {editLoading ? 'Updating...' : 'Update'}
                    </button>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>
            </div>
            {viewLoading ? <p className="text-center">Loading...</p> :
                <div className="offcanvas-body" style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                    maxHeight: 'calc(100vh - 100px)',
                    marginTop: '-2rem'
                }}>
                    <div className="row">
                        <div className={`col-6 mb-2 ${isMobile ? 'd-none' : ''}`}>
                            <label className="form-label justify-content-start d-flex">Requested Date</label>
                            <input
                                type="text"
                                className="form-control"
                                value={formatDate(passObj?.RequestDate)}
                                readOnly
                            />
                        </div>
                        <div className="col-12 col-md-6 col-md-4 mb-2">
                            <label className="form-label">Unit<span className="text-danger fw-bold">*</span></label>
                            <Select
                                className="w-100"
                                placeholder="Choose Unit"
                                required
                                showSearch
                                optionFilterProp="children"
                                style={{ height: '3.1rem' }}
                                value={editData.RequestPass.UnitId || undefined}   // ✅ Pre-select from editData
                                onChange={(value) => {
                                    setEditData((prev) => ({
                                        ...prev,
                                        RequestPass: {
                                            ...prev.RequestPass,
                                            UnitId: value,   // ✅ update selected Unit
                                        },
                                    }));
                                }}
                                disabled={true}
                            >
                                {unitsData?.map((item) => (
                                    <Option key={item.ItemId} value={item.ItemId}>
                                        {item.DisplayValue}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label justify-content-start d-flex">Meeting Date<span className="text-danger fw-bold">*</span></label>
                            <input
                                type="date"
                                className="form-control"
                                name="MeetingDate"
                                value={editData.RequestPass.MeetingDate}
                                onChange={handleChange}
                                min={new Date().toISOString().split("T")[0]}
                                onKeyDown={(e) => e.preventDefault()}
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label justify-content-start d-flex">Time<span className="text-danger fw-bold">*</span></label>
                            <input
                                type="time"
                                className="form-control"
                                name="MeetingTime"
                                value={editData.RequestPass.MeetingTime}
                                onChange={handleChange}
                            />
                        </div>
                        {(editData?.RequestPass?.VisitorType === 3) &&
                            <div className="col-6 mb-2">
                                <label className="form-label justify-content-start d-flex">Expiry Date<span className="text-danger fw-bold">*</span></label>
                                <input
                                    type="date"
                                    className="form-control"
                                    name="ExpiryDate"
                                    value={editData?.RequestPass?.ExpiryDate || ''}
                                    onChange={handleChange}
                                    min={new Date(new Date(editData.RequestPass.MeetingDate).getTime() + 86400000)
                                        .toISOString()
                                        .split("T")[0]
                                    }
                                    onKeyDown={(e) => e.preventDefault()}
                                />
                            </div>
                        }
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label justify-content-start d-flex">Visitor Type<span className="text-danger fw-bold">*</span></label>
                            <Select
                                style={{ width: '100%', height: '3.4rem' }}
                                placeholder="Choose visitor type"
                                value={selectedType ?? undefined}
                                onChange={(value) => {
                                    const typeId = parseInt(value);
                                    const isInOther = otherTypes.some(type => type.Id === typeId);
                                    setShowAllTypes(isInOther);
                                    handleChange({ target: { name: 'VisitorType', value: value.toString() } });
                                }}
                                onSearch={(val) => setSearchText(val)}
                                filterOption={false}
                                allowClear
                                required
                                showSearch
                                disabled={visitorType === 3}
                            >
                                {filteredTop.length > 0 && (
                                    <OptGroup label="Common Types">
                                        {filteredTop.map(type => (
                                            <Option key={type.Id} value={type.Id}>
                                                {type.TypeName}
                                            </Option>
                                        ))}
                                    </OptGroup>
                                )}

                                {showAllTypes && filteredOther.length > 0 && (
                                    <OptGroup label="Other Types">
                                        {filteredOther.map(type => (
                                            <Option key={type.Id} value={type.Id}>
                                                {type.TypeName}
                                            </Option>
                                        ))}
                                    </OptGroup>
                                )}

                                {!showAllTypes && otherTypes.length > 0 && (
                                    <Option disabled>
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowAllTypes(true);
                                            }}
                                            style={{ color: '#1677ff', cursor: 'pointer' }}
                                        >
                                            + Show other types
                                        </span>
                                    </Option>
                                )}
                            </Select>
                        </div>
                        <div className="col-12 mb-2">
                            <label className="form-label justify-content-start d-flex">Remarks</label>
                            <textarea
                                name="Remarks"
                                className="form-control"
                                rows={3}
                                placeholder="Notes.."
                                value={editData.RequestPass.Remarks}
                                onChange={handleChange}
                            ></textarea>
                        </div>
                    </div>

                    <div className="d-flex mt-2">
                        <h4 className={`text-start mt-2 mb-4 ${attendeesData?.length > 0 ? 'd-block' : 'd-none'}`}>Attendees:</h4>
                        <button className="btn btn-info btn-sm d-flex ms-auto text-hover-primary" type="button" onClick={handleAddAttendee}>
                            <i className="fa-solid fa-person-circle-plus fs-3"></i>
                        </button>
                    </div>
                    {editData.Attendees.map((attendee, index) => (
                        <div key={index} className="mb-2 align-items-center">
                            <div className="row">
                                <div className="col-12 col-md-4 col-lg-4 my-1">
                                    <label className="form-label">Name<span className="text-danger fw-bold">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors[`Name-${index}`] ? 'is-invalid' : ''}`}
                                        value={attendee.Name || ""}
                                        onChange={(e) => handleAttendeeChange(index, "Name", sanitizeNameInput(e.target.value))}
                                        placeholder="Enter name"
                                    />
                                </div>
                                <div className="col-12 col-md-4 col-lg-4 my-1">
                                    <label className="form-label">Phone</label>
                                    <div className="input-group">
                                        <span className="input-group-text" id={`phone-addon-${index}`}>+91</span>
                                        <input
                                            type="text"
                                            className={`form-control ${errors[`Mobile-${index}`] ? 'is-invalid' : ''}`}
                                            value={attendee.Mobile || ""}
                                            onChange={(e) =>
                                                handleAttendeeChange(index, "Mobile", e.target.value.replace(/\D/g, ""))
                                            }
                                            maxLength={10}
                                            inputMode="numeric"
                                            placeholder="Enter 10-digit mobile number"
                                            aria-describedby={`phone-addon-${index}`}
                                        />
                                    </div>
                                </div>

                                <div className="col-12 col-md-4 col-lg-4 my-1">
                                    <label className="form-label">Email</label>
                                    <input
                                        type="email"
                                        className={`form-control ${emailErrors[index] ? 'is-invalid' : ''}`}
                                        value={attendee.Email || ""}
                                        onChange={(e) => handleAttendeeChange(index, "Email", e.target.value)}
                                        placeholder="Enter email"
                                    />
                                    {emailErrors[index] && <div className="invalid-feedback">{emailErrors[index]}</div>}
                                </div>
                                <div className="col-6 col-md-4 col-lg-4 my-1">
                                    <label className="form-label justify-content-start d-flex">Company Name<span className="text-danger fw-bold">*</span></label>
                                    <input
                                        type="text"
                                        className={`form-control ${errors[`CompanyName-${index}`] ? 'is-invalid' : ''}`}
                                        name="CompanyName"
                                        value={attendee.CompanyName}
                                        onChange={(e) => handleAttendeeChange(index, "CompanyName", e.target.value.toUpperCase())}
                                        placeholder="Enter company name"
                                    />
                                </div>
                                <div className="col-6 col-md-4 col-lg-4 my-1">
                                    <label className="form-label justify-content-start d-flex">{`${!isMobile ? 'Department to Meet' : 'Department'}`}<span className="text-danger fw-bold">*</span></label>
                                    <Select
                                        className="w-100"
                                        placeholder="Choose Dept"
                                        value={attendee.DeptId || undefined}
                                        onChange={(value) => handleAttendeeChange(index, "DeptId", value)}
                                        showSearch
                                        optionFilterProp="children"
                                        allowClear
                                        style={{ height: '3.1rem' }}
                                    >
                                        {Dep.map((item) => (
                                        <Option key={item.Id} value={item.Id}>
                                            {item.DeptName}
                                        </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-6 col-md-4 col-lg-4 my-1">
                                    <label className="form-label justify-content-start d-flex">Designation</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        name="Designation"
                                        value={attendee.Designation}
                                        onChange={(e) => handleAttendeeChange(index, "Designation", toTitleCase(e.target.value))}
                                        placeholder="Enter designation"
                                    />
                                </div>
                                <div className="col-6 col-md-4 col-lg-4 my-1">
                                    <label className="form-label justify-content-start d-flex">Vehicle No</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter vehicle no"
                                        name="VehicleInfo"
                                        value={attendee.VehicleInfo}
                                        onChange={(e) => handleAttendeeChange(index, "VehicleInfo", e.target.value)}
                                    />
                                </div>
                                <div className="col-3 col-md-4 col-lg-4 my-1">
                                    <label className="form-label justify-content-start d-flex">Notify</label>
                                    <input
                                        type="checkbox"
                                        name="Notify"
                                        checked={attendee.Notify}
                                        onChange={(e) => handleAttendeeChange(index, "Notify", e.target.checked ? 1 : 0)}
                                    />
                                </div>
                                <div className="col-3 col-md-4 col-lg-4 my-1">
                                    <button
                                        className="btn text-danger"
                                        onClick={() => handleDeleteAttendee(attendee, index)}
                                    >
                                        <i className="fa-regular fa-trash-can"></i>
                                    </button>
                                </div>
                            </div>
                            <hr className="text-primary shadow" />
                        </div>
                    ))}
                </div>
            }
        </div>
    )
};

EditPass.propTypes = {
    passObj: PropTypes.object.isRequired
};