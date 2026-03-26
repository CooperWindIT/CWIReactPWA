import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_API } from "../Config/Config";
import Img1 from '../Assests/SigninImages/im1.png';
import Img2 from '../Assests/SigninImages/im2.png';
import Img3 from '../Assests/SigninImages/im3.png';
import Img4 from '../Assests/SigninImages/im4.png';
import Img5 from '../Assests/SigninImages/im5.png';
import Img6 from '../Assests/SigninImages/im6.png';
import Img7 from '../Assests/SigninImages/im7.png';
import Img8 from '../Assests/SigninImages/im8.png';
import Img9 from '../Assests/SigninImages/image8.png';
import Img10 from '../Assests/SigninImages/image10.png';
// import Img11 from '../Assests/SigninImages/image20.png';
import Img12 from '../Assests/SigninImages/image22.png';
import CWIImg from '../Assests/SigninImages/cwinew.png';
import WaterMarkLogo from '../Assests/SigninImages/cwilogo.png';
import { message } from 'antd';

export default function NewSignIn() {

    const [messageApi, contextHolder] = message.useMessage();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotEmailBtnLoading, setForgotEmailBtnLoading] = useState(false);
    const [frogotPWDBtnLoading, setFrogotPWDBtnLoading] = useState(false);
    const [dispalyEmail, setDispalyEmail] = useState(true);
    const [dispalyOTP, setDispalyOTP] = useState(false);
    const [dispalyPwd, setDispalyPwd] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [otp, setOtp] = useState(new Array(4).fill(""));
    const [loginType, setLoginType] = useState("internal"); // "internal" or "external"
    const inputRefs = useRef([]);
    const emailRef = useRef(null);

    const [formData, setFormData] = useState({
        NewPassword: "",
        ConfirmPassword: "",
    });

    const [strength, setStrength] = useState({
        length: false,
        number: false,
        special: false,
        uppercase: false,
        alphabet: false
    });

    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, otp.length);
    }, [otp]);

    useEffect(() => {
        if (email) {
            setForgotEmail(email);
        }
    }, [email]);

    useEffect(() => {
        emailRef.current?.focus();
    }, []);

    useEffect(() => {
        sessionStorage.clear();
        localStorage.clear();
    }, []);

    const navigate = useNavigate();

    const togglePasswordVisibility = () => {
        setShowPassword((prevState) => !prevState);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const currentLoginMode = loginType;

        setLoading(false);
        setErrorMessage(null);

        try {
            setLoading(true);

            let url = currentLoginMode === "internal"
                ? `${BASE_API}Public/SignIn`
                : `${BASE_API}Public/TechSignIn`;

                const payload =
                currentLoginMode === "internal"
                    ? {
                          Email: email,
                          Password: password,
                      }
                    : {
                          Email: email,   // using email input as username
                          Password: password,
                      };
            
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            setLoading(false);

            if (result?.status === 200) {

                sessionStorage.setItem("userData", JSON.stringify(result.data.user));
                sessionStorage.setItem("accessToken", result.data.accessToken);
                sessionStorage.setItem("refreshToken", result.data.refreshToken);

                if (currentLoginMode === "external") {
                    navigate("/tech-tickets");
                } else {
                    navigate("/user-modules");
                }

            } else if (result?.status === 404) {

                setErrorMessage("User not found. Please check your email ID.");

            } else if (result?.status === 502) {

                setErrorMessage("Incorrect password. Please check your password and try again.");

            } else if (result?.status === 500) {

                setErrorMessage("Password expired. Please use 'Forgot Password' to reset your password.");

            } else {

                setErrorMessage(result?.message || "Something went wrong. Please try again.");

            }

        } catch (err) {
            setErrorMessage("Something went wrong. Please try again later.");
            setLoading(false);
            // setError("Something went wrong. Please try again later.");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (name === "NewPassword") {
            setStrength({
                length: value.length >= 6,
                number: /[0-9]/.test(value),
                special: /[!@#$%^&*(),.?":{}|<>]/.test(value),
                uppercase: /[A-Z]/.test(value),
                alphabet: /[a-zA-Z]/.test(value)
            });
        }
    };

    const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword);
    const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

    const handleFPWSubmit = async (e) => {
        e.preventDefault();

        const isStrong = strength.length && strength.number && strength.special && strength.alphabet && strength.uppercase;

        if (!isStrong) {
            messageApi.error({
                content: "Please meet all password security requirements.",
                duration: 2,
            });
            return;
        }

        if (formData.NewPassword !== formData.ConfirmPassword) {
            messageApi.warning({ content: "Passwords do not match!" });
            return;
        }

        if (formData.NewPassword !== formData.ConfirmPassword) {
            messageApi.warning({
                content: "Passwords do not match!",
                duration: 3,
            });
            return;
        }
        setFrogotPWDBtnLoading(true);

        try {
            const response = await fetch(`${BASE_API}Public/ChangePassword`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Email: forgotEmail,
                    Password: formData.NewPassword,
                    Type: loginType === "internal" ? "Users" : "Technicians"
                }),
            });

            const result = await response.json();

            if (response.ok && result.ResultData.Status === 'Success') {
                setLoading(false);
                setFrogotPWDBtnLoading(false);
                messageApi.success({
                    content: "Password updated successfully! Redirecting...",
                    duration: 2,
                    onClose: () => {
                        setFormData({ Name: "", NewPassword: "", ConfirmPassword: "" });
                        window.location.reload();
                    }
                });

            } else {
                setLoading(false);
                setFrogotPWDBtnLoading(false);
                messageApi.error({
                    content: result.ResultData?.Message || "Failed to update password. Please try again.",
                    duration: 2,
                });
            }
        } catch (error) {
            setLoading(false);
            console.error("Error:", error);
            setFrogotPWDBtnLoading(false);
            messageApi.error({
                content: "An network error occurred. Please try again later.",
                duration: 2,
            });
        }
    };

    // chaitanya26121997@gmail.com
    const handleForgotEmail = async (e) => {
        e.preventDefault();
        setOtp(new Array(4).fill(""));
        setForgotEmailBtnLoading(true);

        try {
            const response = await fetch(`${BASE_API}Public/ForgotPassword`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Email: forgotEmail,
                    Type: loginType === "internal" ? "Users" : "Technicians"
                }),
            });

            const responseData = await response.json();

            if (response.ok) {
                if (responseData.Status) {
                    setForgotEmailBtnLoading(false);
                    setDispalyEmail(false);
                    setDispalyPwd(false);
                    setDispalyOTP(true);
                    messageApi.success({
                        content: responseData.message || "OTP sent successfully!",
                        duration: 3,
                    });
                }
            } else {
                setForgotEmailBtnLoading(false);
                messageApi.error({
                    content: responseData.error || "Failed to send email.",
                    duration: 3,
                });
            }
        } catch (error) {
            setForgotEmailBtnLoading(false);
            console.error("Error:", error);
            messageApi.warning({
                content: "An error occurred. Please check your connection.",
                duration: 2,
            });
        }
    };

    const handleChange = (value, index) => {
        if (/^\d$/.test(value)) { // Accept only digits (0-9)
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);

            // Move to next input if available
            if (index < 3 && inputRefs.current[index + 1]) {
                inputRefs.current[index + 1].focus();
            }
        }
    };

    // Handle Backspace functionality
    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace') {
            const newOtp = [...otp];
            newOtp[index] = ""; // Clear current value
            setOtp(newOtp);

            // Move to the previous input if available
            if (index > 0) {
                inputRefs.current[index - 1].focus();
            }
        }
    };

    // Handle  OTP Submit
    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        const otpValue = otp.join("");
        setForgotEmailBtnLoading(true);

        if (otpValue.length === 4) {
            try {
                const payload = {
                    Email: forgotEmail,
                    OTP: otpValue,
                    Type: loginType === "internal" ? "Users" : "Technicians"
                };

                const response = await fetch(`${BASE_API}Public/ConfirmOTP`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                const responseData = await response.json();

                if (response.ok && responseData.Status) {
                    setForgotEmailBtnLoading(false);
                    setForgotEmailBtnLoading(false);
                    setForgotEmailBtnLoading(false);
                    setFrogotPWDBtnLoading(false);
                    setDispalyEmail(false);
                    setDispalyOTP(false);
                    setDispalyPwd(true);
                    if (responseData.Status) {
                        messageApi.success({
                            content: responseData.message || "OTP matched successfully!",
                            duration: 3,
                        });
                    }
                } else {
                    setForgotEmailBtnLoading(false);
                    setForgotEmailBtnLoading(false);
                    messageApi.error({
                        content: responseData.error || "Failed to send email. Please try again.",
                        duration: 3,
                    });
                }
            } catch (error) {
                setForgotEmailBtnLoading(false);
                setForgotEmailBtnLoading(false);
                console.error("Error:", error);
                messageApi.error({
                    content: "Failed to send email. Please try again.",
                    duration: 2,
                });
            }
        } else {
            alert("Please enter a valid 4-digit OTP.");
        }
    };

    const maskEmail = (email) => {
        if (!email) return "";

        const [user, domain] = email.split("@"); // Split email at '@'
        const maskedUser = user[0] + "*".repeat(user.length - 1); // Mask all characters except the first
        return `${maskedUser}@${domain}`;
    };

    useEffect(() => {
        if (email) {
            document.getElementById("email").classList.add("filled");
        }
        if (password) {
            document.getElementById("password").classList.add("filled");
        }
    }, [email, password]);

    return (
        <>
            <div className="watermark"></div>

            <img src={Img1} className="background-icon icon1" />
            <img src={Img2} className="background-icon icon2" />
            <img src={Img3} className="background-icon icon3" />
            <img src={Img4} className="background-icon icon4" />
            <img src={Img5} className="background-icon icon5" />
            <img src={Img6} className="background-icon icon6 d-none d-md-block" />
            <img src={Img7} className="background-icon icon7 d-none d-md-block" />
            <img src={Img8} className="background-icon icon8" />
            <img src={Img9} className="background-icon icon9" />
            <img src={Img10} className="background-icon icon10" />
            {/* <img src={Img11} className="background-icon icon11" /> */}
            <img src={Img12} className="background-icon icon12" />

            <div className="login-wrapper ">
                <div className="login-card hoverForm shadow-sm">
                    <span className="border-train top-train"></span>
                    <span className="border-train right-train"></span>
                    <span className="border-train bottom-train"></span>
                    <span className="border-train left-train"></span>
                    <img src={CWIImg} className="logo" alt="CWI Logo" />
                    <form onSubmit={handleSubmit} className="">
                        <div className="login-type-container mb-8">
                            <div className="segmented-control">
                                <button
                                    type="button"
                                    className={`control-btn ${loginType === "internal" ? "active" : ""}`}
                                    onClick={() => setLoginType("internal")}
                                >
                                    <i className="fa-solid fa-building-user me-2"></i> Employee
                                </button>
                                <button
                                    type="button"
                                    className={`control-btn ${loginType === "external" ? "active" : ""}`}
                                    onClick={() => setLoginType("external")}
                                >
                                    <i className="fa-solid fa-truck-field me-2"></i> Partner/Supplier
                                </button>
                                <div className={`selection-slider ${loginType}`}></div>
                            </div>
                        </div>
                        {loginType === "internal" && 
                            <div>
                                <p className="login-hint mb-8">
                                    <i class="bi bi-info-circle text-danger blink-icon"></i> Use your official email ID to log in (e.g., abc@cooperwind.in)
                                </p>
                                <div className="user-box">
                                    <input
                                        ref={emailRef}
                                        type="email"
                                        id="email"
                                        className={`input ${email ? "filled" : ""}`}
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setErrorMessage("");
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === " ") e.preventDefault();
                                        }}
                                        disabled={loading}
                                        autoComplete="off"
                                        placeholder="Enter email"
                                        required
                                    />
                                    <label className={`label active`} htmlFor="email">
                                        <i className="bi bi-person text-dark me-1"></i>Email
                                    </label>
                                </div>
                                <div className="user-box position-relative">
                                    <input
                                        className={`input ${password ? "filled" : ""}`}
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setErrorMessage("");
                                        }}
                                        disabled={loading}
                                        autoComplete="off"
                                        placeholder="Enter password"
                                        required
                                    />
                                    <label className={`label active`} htmlFor="password">
                                        <i className="bi bi-key text-dark me-1"></i> Password
                                    </label>
                                    <span
                                        className="position-absolute"
                                        style={{ right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? <i className="fa-regular fa-eye"></i> : <i className="fa-regular fa-eye-slash"></i>}
                                    </span>
                                </div>
                            </div>
                        }

                        {loginType === "external" && 
                            <div>
                                {/* <p className="login-hint mb-8">
                                    <i class="bi bi-info-circle text-danger blink-icon"></i> Use your official email ID to log in (e.g., abc@cooperwind.in)
                                </p> */}
                                <div className="user-box">
                                    <input
                                        ref={emailRef}
                                        type="text"
                                        id="email"
                                        className={`input ${email ? "filled" : ""}`}
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            setErrorMessage("");
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === " ") e.preventDefault();
                                        }}
                                        disabled={loading}
                                        autoComplete="off"
                                        placeholder="Enter email"
                                        required
                                    />
                                    <label className={`label active`} htmlFor="email">
                                        <i className="bi bi-person text-dark me-1"></i>Email
                                    </label>
                                </div>
                                <div className="user-box position-relative">
                                    <input
                                        className={`input ${password ? "filled" : ""}`}
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setErrorMessage("");
                                        }}
                                        disabled={loading}
                                        autoComplete="off"
                                        placeholder="Enter password"
                                        required
                                    />
                                    <label className={`label active`} htmlFor="password">
                                        <i className="bi bi-key text-dark me-1"></i> Password
                                    </label>
                                    <span
                                        className="position-absolute"
                                        style={{ right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                                        onClick={togglePasswordVisibility}
                                    >
                                        {showPassword ? <i className="fa-regular fa-eye"></i> : <i className="fa-regular fa-eye-slash"></i>}
                                    </span>
                                </div>
                            </div>
                        }


                        {errorMessage && (
                            <p className="alert alert-danger">{errorMessage}</p>
                        )}

                        <button type="submit" className="btn gradient-button w-100 mb-2">{loading ? "Please wait..." : "Login"}</button>
                        <div className="d-flex justify-content-between">
                            <a
                                className="forgot-link text-decoration-none"
                                // data-bs-toggle="offcanvas"
                                // href="#offcanvasForgotPassword"
                                role="button"
                                // aria-controls="offcanvasForgotPassword"
                                onClick={() => setShowModal(true)}
                            ><i className="bi bi-person-lock text-primary me-1"></i>Forgot Password?</a>
                        </div>
                    </form>
                </div>
            </div>

            {/* ForgotPassword Offcanvas */}

            {/* Modal Backdrop and Container */}
            {contextHolder}
            {showModal && (
                <div
                    className="modal fade show d-block custom-modal-backdrop"
                    tabIndex="-1"
                    role="dialog"
                >
                    <div className="modal-dialog modal-dialog-centered animate-modal">
                        <div className="modal-content modal-content-premium shadow-lg border-0">

                            {/* Visual Header */}
                            <div className="p-4 text-center bg-light border-bottom">
                                <button
                                    type="button"
                                    className="btn-close position-absolute end-0 top-0 m-3"
                                    onClick={() => setShowModal(false)}
                                ></button>
                                <div className="mb-2">
                                    <span className="badge rounded-pill bg-primary-subtle text-primary px-3 py-2">
                                        Security Protocol
                                    </span>
                                </div>
                                <h4 className="fw-bold m-0">Account Recovery</h4>
                            </div>

                            <div className="modal-body p-4 p-lg-5">

                                {/* Step Indicator */}
                                <div className="stepper-wrapper">
                                    <div className={`step-item ${dispalyEmail ? 'active' : ''}`}>
                                        <div className="step-dot"></div>Email
                                    </div>
                                    <div className={`step-item ${dispalyOTP ? 'active' : ''}`}>
                                        <div className="step-dot"></div>Verify
                                    </div>
                                    <div className={`step-item ${dispalyPwd ? 'active' : ''}`}>
                                        <div className="step-dot"></div>Reset
                                    </div>
                                </div>

                                {/* 1. EMAIL VIEW */}
                                {dispalyEmail && (
                                    <form onSubmit={handleForgotEmail}>
                                        <div className="text-center mb-4">
                                            <h5>What's your email?</h5>
                                            <p className="text-muted small">We'll send a secure code to your inbox.</p>
                                        </div>
                                        <div className="form-floating mb-4">
                                            <input
                                                type="email"
                                                className="form-control form-control-premium"
                                                id="floatingEmail"
                                                placeholder="name@example.com"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                required
                                            />
                                            <label htmlFor="floatingEmail text-muted">Email Address</label>
                                        </div>
                                        <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold py-3 shadow" disabled={forgotEmailBtnLoading}>
                                            {forgotEmailBtnLoading ? <span className="spinner-border spinner-border-sm me-2"></span> : 'Request OTP'}
                                        </button>
                                    </form>
                                )}

                                {/* 2. OTP VIEW */}
                                {dispalyOTP && (
                                    <form onSubmit={handleOTPSubmit}>
                                        <div className="text-center mb-4">
                                            <h5>Verification Code</h5>
                                            <p className="text-muted small">Enter the 4 digits sent to <b>{maskEmail(forgotEmail)}</b></p>
                                        </div>
                                        <div className="d-flex justify-content-center gap-3 mb-4">
                                            {otp.map((digit, index) => (
                                                <input
                                                    key={index}
                                                    ref={(ref) => (inputRefs.current[index] = ref)}
                                                    type="text"
                                                    maxLength="1"
                                                    className="form-control text-center fw-bold fs-3 shadow-sm border-2"
                                                    style={{ width: "60px", height: "70px", borderRadius: "12px" }}
                                                    value={digit}
                                                    onChange={(e) => handleChange(e.target.value, index)}
                                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                                />
                                            ))}
                                        </div>
                                        <button type="submit" className="btn btn-primary btn-lg w-100 fw-bold py-3" disabled={forgotEmailBtnLoading}>
                                            Verify Identity
                                        </button>
                                        <div className="mt-4 text-center">
                                            <p className="text-muted small">Didn't get a code? <button type="button" className="btn btn-link p-0 small fw-bold text-decoration-none" onClick={handleForgotEmail}>Resend Now</button></p>
                                        </div>
                                    </form>
                                )}

                                {/* 3. PASSWORD VIEW */}
                                {dispalyPwd && (
                                    <form onSubmit={handleFPWSubmit}>
                                        <div className="text-center mb-4">
                                            <h5>Create New Password</h5>
                                            <p className="text-muted small">Your new password must be different from previous ones.</p>
                                        </div>
                                        <div className="input-group mb-3">
                                            <div className="form-floating flex-grow-1">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    className="form-control form-control-premium border-end-0"
                                                    id="newPwd"
                                                    placeholder="New Password"
                                                    name="NewPassword"
                                                    value={formData.NewPassword}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                                <label htmlFor="newPwd">New Password</label>
                                            </div>
                                            <button className="btn btn-light border border-start-0" type="button" onClick={toggleShowNewPassword}>
                                                <i className={`fa ${showNewPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
                                            </button>
                                        </div>

                                        <div className="input-group mb-4">
                                            <div className="form-floating flex-grow-1">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    className="form-control form-control-premium border-end-0"
                                                    id="confPwd"
                                                    placeholder="Confirm Password"
                                                    name="ConfirmPassword"
                                                    value={formData.ConfirmPassword}
                                                    onChange={handleInputChange}
                                                    required
                                                />
                                                <label htmlFor="confPwd">Confirm Password</label>
                                            </div>
                                            <button className="btn btn-light border border-start-0" type="button" onClick={toggleShowConfirmPassword}>
                                                <i className={`fa ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"}`}></i>
                                            </button>
                                        </div>

                                        <button type="submit" className="btn btn-success btn-lg w-100 fw-bold py-3 shadow" disabled={frogotPWDBtnLoading}>
                                            {frogotPWDBtnLoading ? 'Updating...' : 'Secure Account'}
                                        </button>
                                        {/* Strength Checklist */}
                                        <div className="mb-4 p-3 bg-light rounded-3 border border-dashed">
                                            <p className="small fw-bold text-uppercase text-muted mb-2" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>
                                                Security Requirements:
                                            </p>
                                            <div className="row g-2">
                                                <div className={`col-6 small ${strength.length ? 'text-success' : 'text-muted'}`}>
                                                    <i className={`fa ${strength.length ? 'fa-check-circle' : 'fa-circle-thin'} me-2`}></i>
                                                    6+ Characters
                                                </div>
                                                <div className={`col-6 small ${strength.uppercase ? 'text-success' : 'text-muted'}`}>
            <i className={`fa ${strength.uppercase ? 'fa-check-circle' : 'fa-circle-o'} me-2`}></i>
            Capital Case (A-Z)
        </div>
                                                <div className={`col-6 small ${strength.alphabet ? 'text-success' : 'text-muted'}`}>
                                                    <i className={`fa ${strength.alphabet ? 'fa-check-circle' : 'fa-circle-thin'} me-2`}></i>
                                                    Letters (a-z)
                                                </div>
                                                <div className={`col-6 small ${strength.number ? 'text-success' : 'text-muted'}`}>
                                                    <i className={`fa ${strength.number ? 'fa-check-circle' : 'fa-circle-thin'} me-2`}></i>
                                                    Numbers (0-9)
                                                </div>
                                                <div className={`col-6 small ${strength.special ? 'text-success' : 'text-muted'}`}>
                                                    <i className={`fa ${strength.special ? 'fa-check-circle' : 'fa-circle-thin'} me-2`}></i>
                                                    Special (!@#)
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                /* Modern Modal Styling */
                    .custom-modal-backdrop {
                        backdrop-filter: blur(8px) saturate(180%);
                        background-color: rgba(0, 0, 0, 0.4) !important;
                    }

                    .modal-content-premium {
                        border-radius: 1.25rem !important;
                        border: 1px solid rgba(255, 255, 255, 0.2) !important;
                        overflow: hidden;
                    }

                    /* Progress Stepper */
                    .stepper-wrapper {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 2rem;
                    }
                    .step-item {
                        flex: 1;
                        text-align: center;
                        position: relative;
                        font-size: 0.75rem;
                        color: #adb5bd;
                        font-weight: 600;
                    }
                    .step-item.active { color: #007bff; }
                    .step-dot {
                        width: 10px;
                        height: 10px;
                        background: #dee2e6;
                        border-radius: 50%;
                        margin: 0 auto 5px;
                    }
                    .active .step-dot {
                        background: #007bff;
                        box-shadow: 0 0 0 4px rgba(0, 123, 255, 0.2);
                    }

                    /* Animations */
                    @keyframes modalEntry {
                        from { opacity: 0; transform: scale(0.9) translateY(20px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }

                    .animate-modal {
                        animation: modalEntry 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }

                    /* Input Overrides */
                    .form-control-premium {
                        border: 2px solid #f1f3f5 !important;
                        transition: all 0.2s ease;
                    }

                    .form-control-premium:focus {
                        border-color: #007bff !important;
                        background-color: #fff !important;
                        transform: translateY(-1px);
                    }
                    .blink-icon {
                        animation: softBlink 1.5s ease-in-out infinite;
                    }

                    @keyframes softBlink {
                        0%   { opacity: 1; }
                        50%  { opacity: 0.3; }
                        100% { opacity: 1; }
                    }
                    .login-hint {
                        font-size: 12px;
                        color: #6c757d;
                        text-align: center;
                    }
                    .segmented-control {
                        position: relative;
                        display: flex;
                        background: #f1f3f4;
                        border-radius: 12px;
                        padding: 4px;
                        margin-bottom: 2rem;
                    }

                    .control-btn {
                        position: relative;
                        z-index: 2;
                        flex: 1;
                        border: none;
                        background: none;
                        padding: 12px;
                        font-weight: 600;
                        color: #5f6368;
                        transition: color 0.3s ease;
                        cursor: pointer;
                    }

                    .control-btn.active {
                        color: #ffffff;
                    }

                    .selection-slider {
                        position: absolute;
                        top: 4px;
                        bottom: 4px;
                        width: calc(50% - 4px);
                        background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%); /* Match your gradient-button */
                        border-radius: 10px;
                        transition: transform 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
                        z-index: 1;
                    }

                    .selection-slider.external {
                        transform: translateX(100%);
                    }
                    .hoverForm:hover {
                        z-index: 1000
                    }
                    .login-wrapper {
                    position: relative;
                    z-index: 10;
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 1rem;
                    }

                    .login-card img.logo {
                        height: 80px;
                        margin-bottom: 10px;
                    }

                    .background-icon {
                        position: absolute;
                        opacity: 0.25;
                        width: 160px;
                        height: auto;
                        z-index: 800;
                        transition: transform 0.4s ease, filter 0.4s ease;
                        pointer-events: auto;
                    }

                    .background-icon:hover {
                        transform: scale(1.15);
                        filter: brightness(1.3);
                        opacity: 0.9;
                        /* Optional: increase opacity slightly */
                        z-index: 1000;
                        /* Bring it above others if needed */
                    }

                    /* Rearranged for better spread including top corners and under card */
                    .icon1 {
                        top: 5%;
                        left: 5%;
                    }

                    .icon2 {
                    top: 5%;
                    right: 4%;
                    }

                    .icon3 {
                    top: 20%;
                    left: 15%;
                    }

                    .icon4 {
                    top: 20%;
                    right: 19%;
                    }

                    .icon5 {
                    top: 43%;
                    left: 1%;
                    }

                    .icon6 {
                    top: 40%;
                    right: 3%;
                    }

                    .icon7 {
                    bottom: 10%;
                    left: 16%;
                    }

                    .icon8 {
                    bottom: 18%;
                    right: 14%;
                    }

                    .icon9 {
                    bottom: 7%;
                    left: 4%;
                    }

                    .icon10 {
                    bottom: 2%;
                    right: 5%;
                    }

                    .icon11 {
                        top: 10%;
                        left: 44%;
                    }

                    .icon12 {
                    top: 79%;
                    right: 40%;
                    }

                    .watermark {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: url(${WaterMarkLogo}) center center no-repeat;
                        background-size: contain;
                        opacity: 0.05;
                        z-index: 0;
                        pointer-events: none;
                    }

                    .forgot-link {
                    font-size: 0.9rem;
                    }

                    /* RESPONSIVE: Adjust image sizes and spacing */
                    @media (max-width: 768px) {
                    .background-icon {
                        width: 120px;
                        opacity: 0.2;
                    }

                    .login-card {
                        padding: 1.5rem 1.2rem;
                        border-radius: 16px;
                        max-width: 90%;
                    }

                    .login-wrapper {
                        padding: 0.5rem;
                    }
                    }

                    @media (max-width: 480px) {
                    .background-icon {
                        width: 90px;
                        opacity: 0.15;
                    }

                    .login-card {
                        padding: 1.2rem;
                        max-width: 95%;
                    }
                    }
                    .input.filled ~ .label {
                        top: -12px;
                        font-size: 12px;
                        background-color: #d2e7ee;
                        color: #000000;
                        padding: 0 5px;
                        left: 1%;
                        font-weight: 600;
                        border-radius: 15px;
                    }


                    @keyframes electricBorder {
                    0% {
                        background-position: 0% 50%;
                    }

                    100% {
                        background-position: 400% 50%;
                    }
                    }

                    .login-card {
                    position: relative;
                    z-index: 10;
                    overflow: hidden;
                    background-color: rgba(255, 255, 255, 0.02);
                    backdrop-filter: blur(2px);
                    -webkit-backdrop-filter: blur(2px);
                    padding: 2rem 2.5rem;
                    border-radius: 20px;
                    width: 100%;
                    max-width: 420px;
                    text-align: center;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    }

                    /* Glowing border line */
                    .login-card .border-train {
                    position: absolute;
                    background: #c5e0f0;
                    box-shadow: 0 0 6px #b6d9ef, 0 0 10px #a7d5f1;
                    z-index: 1;
                    border-radius: 2px;
                    }

                    /* Top */
                    .login-card .top-train {
                    top: 0;
                    left: 0;
                    height: 2px;
                    width: 100%;
                    animation: topMove 4s linear infinite;
                    }

                    /* Right */
                    .login-card .right-train {
                    top: 0;
                    right: 0;
                    width: 2px;
                    height: 100%;
                    animation: rightMove 4s linear infinite;
                    animation-delay: 1s;
                    }

                    /* Bottom */
                    .login-card .bottom-train {
                    bottom: 0;
                    right: 0;
                    height: 2px;
                    width: 100%;
                    animation: bottomMove 4s linear infinite;
                    animation-delay: 2s;
                    }

                    /* Left */
                    .login-card .left-train {
                    bottom: 0;
                    left: 0;
                    width: 2px;
                    height: 100%;
                    animation: leftMove 4s linear infinite;
                    animation-delay: 3s;
                    }

                    /* Keyframes */
                    @keyframes topMove {
                    0% {
                        transform: translateX(-100%);
                    }

                    100% {
                        transform: translateX(100%);
                    }
                    }

                    @keyframes rightMove {
                    0% {
                        transform: translateY(-100%);
                    }

                    100% {
                        transform: translateY(100%);
                    }
                    }

                    @keyframes bottomMove {
                    0% {
                        transform: translateX(100%);
                    }

                    100% {
                        transform: translateX(-100%);
                    }
                    }

                    @keyframes leftMove {
                    0% {
                        transform: translateY(100%);
                    }

                    100% {
                        transform: translateY(-100%);
                    }
                    }

                    .user-box {
                    position: relative;
                    margin-bottom: 30px;
                    }

                    .user-box .input {
                    width: 100%;
                    padding: 10px 0;
                    background: transparent;
                    border: none;
                    border: 1px solid #ccc;
                    color: #000;
                    font-size: 16px;
                    padding: 10px 0 10px 12px;
                    border-radius: 6px;
                    }

                    .user-box .label {
                    position: absolute;
                    top: 10px;
                    left: 0;
                    padding: 0 5px;
                    color: #666;
                    background-color: transparent;
                    transition: 0.3s ease;
                    font-size: 16px;
                    pointer-events: none;
                    }

                    .input:focus~.label,
                    .input:valid~.label {
                        top: -12px;
                        font-size: 12px;
                        background-color: #d2e7ee;
                        color: #000000;
                        padding: 0 5px;
                        left: 2%;
                        font-weight: 600;
                        border-radius: 15px;
                    }
                    .label.active {
                        top: -12px;
                        font-size: 12px;
                        background-color: #d2e7ee;
                        color: #000;
                        padding: 0 5px;
                        left: 1%;
                        font-weight: 600;
                        border-radius: 15px;
                    }
                    .toggleeye {
                    position: absolute;
                    right: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #555;
                    cursor: pointer;
                    z-index: 1;
                    }

                    .gradient-button {
                    background: linear-gradient(270deg, #e0f7ff, #03e9f4, #e0f7ff);
                    background-size: 600% 600%;
                    animation: gradientMove 5s ease infinite;
                    border: none;
                    color: white;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    border-radius: 6px;
                    }

                    /* Gradient animation */
                    @keyframes gradientMove {
                    0% {
                        background-position: 0% 50%;
                    }
                    50% {
                        background-position: 100% 50%;
                    }
                    100% {
                        background-position: 0% 50%;
                    }
                    }
                `}
            </style>
        </>
    );
}