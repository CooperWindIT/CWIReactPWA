import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { DatePicker } from 'antd';
import dayjs from 'dayjs';
import { Select } from "antd";
import { fetchWithAuth } from "../../utils/api";

export default function AddVisit() {

    const [sessionUserData, setsessionUserData] = useState([]);
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [attendees, setAttendees] = useState([]);
    const [Dep, setDep] = useState([]);
    const [emailErrors, setEmailErrors] = useState({});
    const [visitorType, setVisitorType] = useState(null);
    const [visitorTypesData, setVisitorTypesData] = useState([]);
    const [showAllTypes, setShowAllTypes] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [unitsData, setUnitsData] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState(null);

    const { Option, OptGroup } = Select;

    useEffect(() => {
        const userDataString = sessionStorage.getItem('userData');
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        } else {
            console.log('User data not found in sessionStorage');
        }
    }, []);

    const [formData, setFormData] = useState({
        orgid: sessionUserData.OrgId,
        userid: sessionUserData.Id,
        Operation: "ADD",
        RequestPass: {
            RequestDate: "",
            MeetingDate: "",
            ExpiryDate: "",
            VisitorType: "",
            Remarks: "",
            UnitId: "",
        },
        Attendees: [],
    });

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
            // if (filteredData.length > 0) {
            //     setSelectedUnitId(filteredData[0].ItemId);
            // }
        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
        }
    }

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchUnits();
        }
    }, [sessionUserData]);

    const handleRequestPassChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            RequestPass: {
                ...prevState.RequestPass,
                [name]: value,
            },
        }));
    };

    const handleDateChange = (value, dateString) => {
        if (value) {
            const selectedDate = value.format('YYYY-MM-DD');
            const selectedTime = value.format('HH:mm');

            setFormData(prev => ({
                ...prev,
                RequestPass: {
                    ...prev.RequestPass,
                    MeetingDate: selectedDate,
                    MeetingTime: selectedTime,
                }
            }));
        }
    };

    const handleExpiryDateChange = (value) => {
        setFormData((prev) => ({
            ...prev,
            RequestPass: {
                ...prev.RequestPass,
                ExpiryDate: value || "", // value is already "YYYY-MM-DD"
            },
        }));
    };

    const addAttendee = () => {
        setAttendees([...attendees,
        {
            AttendeName: "",
            PhoneNumber: "",
            Email: "",
            Vehicleinfo: "",
            IsActive: 1,
            DeptId: "",
            Designation: "",
            IsVehicle: false,
            CompanyName: "",
            Notify: 1,
        }]);
    };

    // const removeAttendee = (index) => {
    //     setAttendees(attendees.filter((_, i) => i !== index));
    // };

    const removeAttendee = (index) => {
        const updatedAttendees = attendees.filter((_, i) => i !== index);

        setAttendees(updatedAttendees);

        // update localStorage immediately
        const savedDraft = localStorage.getItem(`visitDraft_${sessionUserData.Id}`);
        if (savedDraft) {
            const draftData = JSON.parse(savedDraft);
            draftData.Attendees = updatedAttendees;
            localStorage.setItem(`visitDraft_${sessionUserData.Id}`, JSON.stringify(draftData));
        }
    };


    const handleAttendeeChange = (index, field, value) => {
        if (field === 'PhoneNumber') {
            if (value !== "" && !/^\d{0,10}$/.test(value)) {
                Swal.fire({
                    title: "Invalid Input",
                    text: "Please enter only numbers (max 10 digits) without letters or special characters.",
                    icon: "error",
                });
                return;
            }
        }

        if (field === 'Email') {
            setEmailErrors((prevErrors) => {
                const updatedErrors = { ...prevErrors };
                if (validateEmail(value)) {
                    delete updatedErrors[index];
                } else {
                    updatedErrors[index] = 'Please enter a valid email ending with .com or .in';
                }
                return updatedErrors;
            });
        }

        setAttendees((prevAttendees) => {
            const updatedAttendees = [...prevAttendees];
            updatedAttendees[index] = {
                ...updatedAttendees[index],
                [field]: value,
            };
            return updatedAttendees;
        });
    };

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.(com|in|gov|tech|info|org|net|us|edu|shop|dev)$/i;
        return regex.test(email);
    };

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

    const topThreeTypes = Array.isArray(visitorTypesData) ? visitorTypesData.slice(0, 3) : [];
    const otherTypes = Array.isArray(visitorTypesData) ? visitorTypesData.slice(3) : [];

    useEffect(() => {
        const filterList = (list) =>
            list.filter((type) =>
                type.TypeName.toLowerCase().includes(searchText.toLowerCase())
            );

        setFilteredTop(filterList(topThreeTypes));
        setFilteredOther(filterList(otherTypes));
    }, [searchText, visitorTypesData]);

    const [filteredTop, setFilteredTop] = useState(topThreeTypes);
    const [filteredOther, setFilteredOther] = useState(otherTypes);

    const disabledTime = (current) => {
        if (!current) return {};

        const now = dayjs();

        // If the selected date is today
        if (current.isSame(now, 'day')) {
            const disabledHours = [];
            for (let i = 0; i < 24; i++) {
                if (i < now.hour()) disabledHours.push(i);
            }

            const disabledMinutes = [];
            if (current.hour() === now.hour()) {
                for (let i = 0; i < 60; i++) {
                    if (i < now.minute()) disabledMinutes.push(i);
                }
            }

            return {
                disabledHours: () => disabledHours,
                disabledMinutes: () => disabledMinutes,
            };
        }

        return {};
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDep();
        }
    }, [sessionUserData]);

    const getCurrentDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };

    //region Handle Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);

        let hasInvalidEmail = false;
        const newEmailErrors = {};

        formData.Attendees.forEach((attendee, index) => {
            // console.log("Checking:", attendee.Email);
            if (!validateEmail(attendee.Email)) {
                newEmailErrors[index] = 'Please enter a valid email ending with .com or .in';
                setAddSubmitLoading(false);
                hasInvalidEmail = true;
                return;
            }
        });

        setEmailErrors(newEmailErrors);

        if (!selectedUnitId) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Unit',
                text: 'Please choose a unit!',
            });
            setAddSubmitLoading(false);
            return;
        }

        if (hasInvalidEmail) {
            setAddSubmitLoading(false);
            return;
        }

        if (!formData.RequestPass.MeetingDate) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Meeting Date',
                text: 'Please choose a meeting date!',
            });
            setAddSubmitLoading(false);
            return;
        }

        if (visitorType === 3) {
            if (!formData.RequestPass.ExpiryDate) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Missing Expiry Date',
                    text: 'Please choose a expiry date!',
                });
                setAddSubmitLoading(false);
                return;
            }
        }

        if (!visitorType) {
            Swal.fire({
                icon: 'warning',
                title: 'Missing Visitor Type',
                text: 'Please choose visitor type!',
            });
            setAddSubmitLoading(false);
            return;
        }

        if (attendees.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Attendees',
                text: 'Please add at least one attendee!',
            });
            setAddSubmitLoading(false);
            return;
        }
        for (let i = 0; i < attendees.length; i++) {
            const mobile = attendees[i].PhoneNumber;
            if (mobile && !/^\d{10}$/.test(mobile)) {
                Swal.fire({
                    title: "Invalid Mobile Number",
                    text: `Attendee ${i + 1}: Mobile number must be exactly 10 digits.`,
                    icon: "error",
                });
                setAddSubmitLoading(false);
                return;
            }
        }

        try {
            const cleanedAttendees = attendees.map((attendee) => ({
                Id: 0,
                Name: attendee.AttendeName || "",
                Email: attendee.Email || "",
                Mobile: attendee.PhoneNumber || "",
                CompanyName: attendee.CompanyName || "",
                Designation: attendee.Designation || "",
                IsVehicle: attendee.IsVehicle ? 1 : 0,
                VehicleInfo: attendee.Vehicleinfo || "",
                DeptId: attendee.DeptId ? parseInt(attendee.DeptId) : 0,
                Notify: attendee.Notify || 0,
            }));

            const updatedFormData = {
                orgid: sessionUserData.OrgId,
                userid: sessionUserData.Id,
                Operation: "ADD",
                RequestPass: {
                    RequestDate: getCurrentDate(),
                    MeetingDate: formData.RequestPass.MeetingDate,
                    MeetingTime: formData.RequestPass.MeetingTime,
                    ExpiryDate: formData.RequestPass.ExpiryDate || null,
                    Remarks: formData.RequestPass.Remarks,
                    VisitorType: visitorType,
                    Status: "DRAFT",
                    UnitId: selectedUnitId,
                },
                Attendees: cleanedAttendees
            };

            const response = await fetchWithAuth(`visitor/ManageVisitorsPass`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedFormData),
            });

            const draftKey = `visitDraft_${sessionUserData.Id}`;
            localStorage.removeItem(draftKey);


            const data = await response.json();

            if (response.ok) {
                setAddSubmitLoading(false);
                if (data.data.result[0]?.Success === 1) {
                    Swal.fire({
                        title: 'Success',
                        text: 'The record has been added successfully.',
                        icon: 'success',
                    }).then(() => {
                        window.location.reload();
                    })
                } else {
                    setAddSubmitLoading(false);
                    Swal.fire({ title: 'Error', text: 'There was an error adding the record.', icon: 'error' });
                }
            } else {
                setAddSubmitLoading(false);
                Swal.fire({ title: 'Error', text: 'Failed to submit request', icon: 'error' });
            }
        } catch (error) {
            setAddSubmitLoading(false);
            console.error('Error:', error);
            Swal.fire({ title: 'Error', text: 'An error occurred', icon: 'error' });
        }
    };

    const handleSaveDraft = () => {
        try {
            const draftKey = `visitDraft_${sessionUserData.Id}`;
            const draft = {
                ...formData,
                Attendees: attendees, // ✅ always use latest attendees state
                RequestPass: {
                    ...formData.RequestPass,
                    VisitorType: visitorType, // include visitor type here
                },
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));
            Swal.fire(
                "Saved!",
                "Your data has been saved locally. Please click on the Submit button to raise a request.",
                "success"
            );
        } catch (error) {
            Swal.fire("Error", "Failed to save draft.", "error");
        }
    };

    useEffect(() => {
        const draftKey = `visitDraft_${sessionUserData.Id}`;
        const savedDraft = localStorage.getItem(draftKey);

        if (savedDraft) {
            try {
                const draftData = JSON.parse(savedDraft);
                setFormData(draftData);
                setAttendees(draftData.Attendees || []);
                setVisitorType(draftData.RequestPass?.VisitorType || null);
                // Swal.fire("Draft Loaded", "We found a saved draft and restored it.", "info");
            } catch (e) {
                console.error("Error parsing draft:", e);
            }
        }
    }, [sessionUserData.Id]);
    
    const toTitleCase = (str) => {
        return str
            .split(/([.\s])/g)
            .map(part => {
                if (/[a-zA-Z]/.test(part)) {
                    // ONLY uppercase the first letter, leave the rest of the string EXACTLY as user typed
                    return part.charAt(0).toUpperCase() + part.slice(1);
                }
                return part;
            })
            .join('');
    };

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);


    return (
        <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasRightAdd" aria-labelledby="offcanvasRightLabel"
            style={{ width: '90%', }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAdd {
                            width: 55% !important;
                        }
                    }
                `}
            </style>
            <form onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Create Visit</h5>
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-warning me-2 btn-sm"
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={addSubmitLoading}
                        >
                            <i className="bi bi-bookmark-check"></i>Save As Draft
                        </button>
                        <button
                            className="btn btn-primary me-2 btn-sm"
                            type="submit"
                            disabled={addSubmitLoading}
                        >
                            <i className="bi bi-check2-all"></i>{addSubmitLoading ? 'Submitting...' : 'Submit'}
                        </button>
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
                    maxHeight: 'calc(100vh - 100px)'
                }}>
                    <div className="row">
                        <div className="col-12 col-md-6 col-md-4 mb-2">
                            <label className="form-label">Unit<span className="text-danger fw-bold">*</span></label>
                            <Select
                                className="w-100"
                                placeholder="Choose Unit"
                                value={selectedUnitId}
                                onChange={(value) => setSelectedUnitId(value)}
                                showSearch
                                optionFilterProp="children"
                                style={{ height: '2.8rem' }}
                                required
                            >
                                {unitsData?.map((item) => (
                                    <Option key={item.ItemId} value={item.ItemId}>
                                        {item.DisplayValue}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label justify-content-start d-flex">Date<span className="text-danger fw-bold">*</span></label>
                            {isMobile ? (
                                <input
                                    type="datetime-local"
                                    className="form-control"
                                    value={
                                        formData.RequestPass.MeetingDate && formData.RequestPass.MeetingTime
                                            ? `${formData.RequestPass.MeetingDate}T${formData.RequestPass.MeetingTime}`
                                            : ""
                                    }
                                    min={dayjs().format("YYYY-MM-DDTHH:mm")}
                                    onChange={(e) => {
                                        const [date, time] = e.target.value.split("T");
                                        handleDateChange(dayjs(`${date} ${time}`, "YYYY-MM-DD HH:mm"));
                                    }}
                                    style={{ width: "100%", height: "2.8rem" }}
                                />
                            ) : (
                                <DatePicker
                                    showTime
                                    format="DD-MM-YYYY HH:mm"
                                    onChange={handleDateChange}
                                    style={{ width: "100%", height: "2.8rem" }}
                                    disabledDate={(current) => current && current < dayjs().startOf("day")}
                                    disabledTime={disabledTime}
                                    onKeyDown={(e) => e.preventDefault()}
                                    value={
                                        formData.RequestPass.MeetingDate
                                            ? dayjs(
                                                `${formData.RequestPass.MeetingDate} ${formData.RequestPass.MeetingTime}`,
                                                "YYYY-MM-DD HH:mm"
                                            )
                                            : null
                                    }
                                />
                            )}

                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label justify-content-start d-flex">Visitor Type<span className="text-danger fw-bold">*</span></label>
                            <Select
                                style={{ width: '100%', height: '2.8rem' }}
                                placeholder="Choose visitor type"
                                value={visitorType !== null ? visitorType : undefined}
                                onChange={(value) => {
                                    setVisitorType(value);
                                    // auto-show other group if selected from there
                                    const isOther = otherTypes.some(t => t.Id === value);
                                    setShowAllTypes(isOther);
                                }}
                                onSearch={(val) => setSearchText(val)}
                                filterOption={false} // disable default filtering
                                allowClear
                                required
                                showSearch
                            >
                                {filteredTop.length > 0 && (
                                    <OptGroup label="Common Types">
                                        {filteredTop.map((type) => (
                                            <Option key={type.Id} value={type.Id}>
                                                {type.TypeName}
                                            </Option>
                                        ))}
                                    </OptGroup>
                                )}

                                {showAllTypes && filteredOther.length > 0 && (
                                    <OptGroup label="Other Types">
                                        {filteredOther.map((type) => (
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
                        <div className={`col-12 col-md-6 ${visitorType === 3 ? 'd-block' : 'd-none'} mb-2`}>
                            <label className="form-label justify-content-start d-flex">Expiry Date<span className="text-danger fw-bold">*</span></label>
                            <input
                                type="date"
                                className="form-control"
                                style={{ height: "2.8rem" }}
                                disabled={!formData.RequestPass.MeetingDate}
                                value={formData.RequestPass.ExpiryDate || ""}
                                onChange={(e) => handleExpiryDateChange(e.target.value)}
                                min={
                                    formData.RequestPass.MeetingDate
                                        ? dayjs(formData.RequestPass.MeetingDate)
                                            .add(1, "day")
                                            .format("YYYY-MM-DD")
                                        : undefined
                                }
                                onKeyDown={(e) => e.preventDefault()} // prevents manual typing
                            />

                        </div>
                        <div className="col-12 mb-2">
                            <label className="form-label justify-content-start d-flex">Remarks <span className="text-danger fw-bold">*</span></label>
                            <textarea
                                name="Remarks"
                                className="form-control"
                                rows={3}
                                placeholder="Enter notes.."
                                onChange={handleRequestPassChange}
                                value={formData.RequestPass.Remarks}
                                required
                            ></textarea>
                        </div>

                        <div className="d-flex mt-2">
                            <h6 className="text-start mt-1">Visitor List:</h6>
                            <button className="btn btn-info btn-sm d-flex ms-auto text-hover-primary mb-2" type="button" onClick={addAttendee}>
                                <i className="fa-solid fa-person-circle-plus fs-3"></i>
                            </button>
                        </div>
                        {attendees.map((attendee, index) => {
                            const accordionId = `accordion-${index}`;
                            const headingId = `heading-${index}`;
                            const collapseId = `collapse-${index}`;

                            return (
                                <div className="accordion" id={accordionId} key={index}>
                                    <div className="accordion-item">
                                        <h2 className="accordion-header" id={headingId}>
                                            <button
                                                className="accordion-button"
                                                type="button"
                                                data-bs-toggle="collapse"
                                                data-bs-target={`#${collapseId}`}
                                                aria-expanded="true"
                                                aria-controls={collapseId}
                                            >
                                                Attendee {index + 1}
                                            </button>
                                        </h2>
                                        <div id={collapseId} className="accordion-collapse collapse show" aria-labelledby={headingId} data-bs-parent={`#${accordionId}`}>
                                            <div className="accordion-body">
                                                <div className="row mb-2 align-items-center">
                                                    <div className="col-12 col-md-4 mb-2 col-lg-4">
                                                        <label className="form-label justify-content-start d-flex">
                                                            Name <span className="text-danger fw-bold">*</span>
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={attendee.AttendeName}
                                                            style={{ height: '2.8rem' }}
                                                            onChange={(e) => handleAttendeeChange(index, 'AttendeName', toTitleCase(e.target.value))}
                                                            onKeyDown={(e) => {
                                                                const allowedKeys = [
                                                                    'Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End', 'Escape',
                                                                ];
                                                                const regex = /^[a-zA-Z.\s]$/;

                                                                if (
                                                                    !regex.test(e.key) &&
                                                                    !allowedKeys.includes(e.key)
                                                                ) {
                                                                    e.preventDefault();
                                                                }
                                                            }}
                                                            placeholder="Attendee name"
                                                            maxLength={50}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="col-12 col-md-4 mb-2 col-lg-4">
                                                        <label className="form-label justify-content-start d-flex">
                                                            Mobile
                                                        </label>
                                                        <div className="input-group">
                                                            <span className="input-group-text" style={{ height: '2.8rem' }}>🇮🇳 +91</span>
                                                            <input
                                                                type="tel"
                                                                className="form-control"
                                                                value={attendee.PhoneNumber}
                                                                onChange={(e) => handleAttendeeChange(index, 'PhoneNumber', e.target.value)}
                                                                placeholder="Mobile no (optional)"
                                                                maxLength={10}
                                                                style={{ height: '2.8rem' }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="col-12 col-md-4 mb-2 col-lg-4">
                                                        <label className="form-label justify-content-start d-flex">Email</label>
                                                        <input
                                                            type="email"
                                                            className={`form-control ${emailErrors[index] ? 'is-invalid' : ''}`}
                                                            value={attendee.Email || ""}
                                                            onChange={(e) => handleAttendeeChange(index, "Email", e.target.value)}
                                                            placeholder="Enter email"
                                                            style={{ height: '2.8rem' }}
                                                        // required
                                                        />
                                                        {emailErrors[index] && <div className="invalid-feedback">{emailErrors[index]}</div>}
                                                    </div>
                                                    <div className="col-6 col-md-4 mb-2 col-lg-4">
                                                        <label className="form-label justify-content-start d-flex">Company Name<span className="text-danger fw-bold">*</span></label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="Enter company name"
                                                            value={attendee.CompanyName}
                                                            onChange={(e) => handleAttendeeChange(index, 'CompanyName', e.target.value.toUpperCase())}
                                                            minLength={3}
                                                            style={{ height: '2.8rem' }}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="col-6 col-md-4 mb-2 col-lg-4">
                                                        <label className="form-label justify-content-start d-flex">Designation<span className="text-danger fw-bold">*</span></label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="Enter designation"
                                                            value={attendee.Designation}
                                                            onChange={(e) => handleAttendeeChange(index, 'Designation', toTitleCase(e.target.value))}
                                                            style={{ height: '2.8rem' }}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="col-6 col-md-4 mb-2 col-lg-4">
                                                        <label className="form-label justify-content-start d-flex">Vehicle No</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="Enter vehicle number"
                                                            value={attendee.Vehicleinfo}
                                                            onChange={(e) => handleAttendeeChange(index, 'Vehicleinfo', e.target.value)}
                                                            style={{ height: '2.8rem' }}
                                                            minLength={4}
                                                        />
                                                    </div>

                                                    <div className="col-6 col-md-4 mb-2 col-lg-4">
                                                        <label className="form-label">{`${!isMobile ? 'Department to Meet' : 'Department'}`}<span className="text-danger fw-bold">*</span></label>
                                                        <Select
                                                            className="w-100"
                                                            placeholder="Choose Dept"
                                                            value={attendee.DeptId || undefined}
                                                            onChange={(value) => handleAttendeeChange(index, 'DeptId', value)}
                                                            required
                                                            showSearch
                                                            optionFilterProp="children"
                                                            style={{ height: '2.8rem' }}
                                                        >
                                                            {Dep?.map((item) => (
                                                                <Option key={item.Id} value={item.Id}>
                                                                    {item.DeptName}
                                                                </Option>
                                                            ))}
                                                        </Select>
                                                    </div>
                                                    <div className="col-2">
                                                        <label className="form-label justify-content-start d-flex">Notify</label>
                                                        <input
                                                            type="checkbox"
                                                            checked={attendee.Notify}
                                                            onChange={(e) => handleAttendeeChange(index, "Notify", e.target.checked ? 1 : 0)}
                                                        />
                                                    </div>
                                                    <div
                                                        className="col-1 d-flex justify-content-end btn text-hover-warning"
                                                        style={{ marginTop: '2rem', cursor: 'pointer' }}
                                                        onClick={() => removeAttendee(index)}
                                                    >
                                                        <i className="fa-regular fa-trash-can fs-4 text-danger"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </form>
        </div>
    )
}