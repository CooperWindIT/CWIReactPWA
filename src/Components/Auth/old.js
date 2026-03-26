import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BASE_API, VMS_URL } from "../Config/Config";
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
import Img11 from '../Assests/SigninImages/image20.png';
import Img12 from '../Assests/SigninImages/image22.png';
import CWIImg from '../Assests/SigninImages/cwinew.png';
import WaterMarkLogo from '../Assests/SigninImages/cwilogo.png';

export default function NewSignIn() {

    const [showPassword, setShowPassword] = useState(false);
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
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
    const [otp, setOtp] = useState(new Array(4).fill(""));
    const inputRefs = useRef([]);

    const [formData, setFormData] = useState({
        Name: "",
        NewPassword: "",
        ConfirmPassword: "",
    });

    useEffect(() => {
        inputRefs.current = inputRefs.current.slice(0, otp.length);
    }, [otp]);

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
        setError(null);
        setLoading(false);
        setErrorMessage(null);

        try {
            setLoading(true);

            const url = `${BASE_API}Public/SignIn`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    UserName: userName,
                    Password: password
                }),
            });

            const result = await response.json();
            setLoading(false);

            if (response.ok) {
                if (result.data.user && result.data.user.length > 0) {
                    // success
                    setLoading(false);
                    sessionStorage.setItem("userData", JSON.stringify(result.data.user[0]));
                    sessionStorage.setItem("accessToken", result.data.accessToken);
                    sessionStorage.setItem("refreshToken", result.data.refreshToken);
                    navigate('/user-modules');
                } else {
                    setLoading(false);
                    setErrorMessage(result.message || "User not found!");
                    console.error("Error during sign-in", result.message);
                }
            } else {
                setLoading(false);
                setErrorMessage(result.message || "User not found!");
                console.error("Error during sign-in", result.message);
            }
            
        } catch (err) {
            setErrorMessage("Something went wrong. Please try again later.");
            setLoading(false);
            setError("Something went wrong. Please try again later.");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const toggleShowNewPassword = () => setShowNewPassword(!showNewPassword);
    const toggleShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

    const handleFPWSubmit = async (e) => {
        e.preventDefault();

        if (formData.NewPassword !== formData.ConfirmPassword) {
            alert("Passwords do not match!");
            return;
        }
        setFrogotPWDBtnLoading(true);

        try {
            const response = await fetch(`${VMS_URL}ChangePassword`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Email: forgotEmail,
                    Password: formData.NewPassword,
                }),
            });

            const result = await response.json();

            if (response.ok && result.ResultData.Status === 'Success') {
                setLoading(false);
                setFrogotPWDBtnLoading(false);
                alert("Password updated successfully!");
                setFormData({ Name: "", NewPassword: "", ConfirmPassword: "" });
                window.location.reload();
            } else {
                setLoading(false);
                setFrogotPWDBtnLoading(false);
                alert("Failed to update password. Please try again.");
            }
        } catch (error) {
            setLoading(false);
            console.error("Error:", error);
            setFrogotPWDBtnLoading(false);
            alert("An error occurred. Please try again later.");
        }
    };

    const handleForgotEmail = async (e) => {
        e.preventDefault();
        setForgotEmailBtnLoading(true);

        try {
            console.log(forgotEmail);
            const response = await fetch(`${VMS_URL}ForgotPassword`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    Email: forgotEmail,
                }),
            });

            const responseData = await response.json();

            if (response.ok) {
                if (responseData.Status) {
                    setForgotEmailBtnLoading(false);
                    setDispalyEmail(false);
                    setDispalyPwd(false);
                    setDispalyOTP(true);
                    alert(responseData.message || "OTP sent successfully!");
                }
            } else {
                setForgotEmailBtnLoading(false);
                alert(responseData.error || "Failed to send email. Please try again.");
            }
        } catch (error) {
            setForgotEmailBtnLoading(false);
            console.error("Error:", error);
            alert("An error occurred. Please try again later.");
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

    // Handle Submit
    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        const otpValue = otp.join("");
        setForgotEmailBtnLoading(true);

        if (otpValue.length === 4) {
            try {
                const payload = {
                    Email: forgotEmail,
                    OTP: otpValue
                };

                const response = await fetch(`${VMS_URL}ConfirmOTP`, {
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
                        alert(responseData.message || "OTP sent successfully!");
                    }
                } else {
                    setForgotEmailBtnLoading(false);
                    setForgotEmailBtnLoading(false);
                    alert(responseData.error || "Failed to send email. Please try again.");
                }
            } catch (error) {
                setForgotEmailBtnLoading(false);
                setForgotEmailBtnLoading(false);
                console.error("Error:", error);
                alert("An error occurred. Please try again later.");
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
        if (userName) {
          document.getElementById("username").classList.add("filled");
        }
        if (password) {
          document.getElementById("password").classList.add("filled");
        }
      }, [userName, password]);

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
            <img src={Img11} className="background-icon icon11" />
            <img src={Img12} className="background-icon icon12" />

            <div className="login-wrapper">
                <div className="login-card hoverForm">
                    <span className="border-train top-train"></span>
                    <span className="border-train right-train"></span>
                    <span className="border-train bottom-train"></span>
                    <span className="border-train left-train"></span>
                    <img src={CWIImg} className="logo" alt="CWI Logo" />
                    <form onSubmit={handleSubmit} className="">
                        <div className="user-box">
                            <input
                                className={`input ${userName ? "filled" : ""}`}
                                type="text"
                                id="username"
                                value={userName}
                                onChange={(e) => {
                                    setUserName(e.target.value);
                                    setErrorMessage("");
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === " ") e.preventDefault();
                                }}
                                disabled={loading}
                                autoComplete="off"
                                placeholder="Enter username"
                                required
                            />
                            <label className={`label active`} htmlFor="username">
                                Username
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
                                Password
                            </label>
                            <span
                                className="position-absolute"
                                style={{ right: "10px", top: "50%", transform: "translateY(-50%)", cursor: "pointer" }}
                                onClick={togglePasswordVisibility}
                            >
                                {showPassword ? <i className="fa-regular fa-eye"></i> : <i className="fa-regular fa-eye-slash"></i>}
                            </span>
                        </div>

                        {errorMessage && (
                            <p className="alert alert-danger">{errorMessage}</p>
                        )}

                        <button type="submit" className="btn gradient-button w-100 mb-2">{loading ? "Please wait..." : "Login"}</button>
                        <div className="d-flex justify-content-between">
                            <a
                                className="forgot-link text-decoration-none"
                                data-bs-toggle="offcanvas"
                                href="#offcanvasForgotPassword"
                                role="button"
                                aria-controls="offcanvasForgotPassword"
                            >Forgot Password?</a>
                            <a className="forgot-link text-decoration-none">Sign up</a>
                        </div>
                    </form>
                </div>
            </div>

            {/* ForgotPassword Offcanvas */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasForgotPassword"
                aria-labelledby="offcanvasForgotPasswordLabel"
            >
                <div className="offcanvas-header">
                    <h5 className="offcanvas-title" id="offcanvasForgotPasswordLabel">
                        Forgot Password
                    </h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>
                <div className="offcanvas-body">
                    <form onSubmit={handleFPWSubmit} className={`${dispalyPwd ? 'd-block' : 'd-none'}`}>
                        {/* <div className="mb-3">
                            <label htmlFor="username" className="form-label">
                                Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                name="Name"
                                value={formData.Name}
                                className="form-control"
                                onChange={handleInputChange}
                                placeholder="Enter username"
                                required
                            />
                        </div> */}
                        <div className="mb-3">
                            <label htmlFor="newPassword" className="form-label">
                                New Password <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    id="newPassword"
                                    name="NewPassword"
                                    value={formData.NewPassword}
                                    className="form-control"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    onChange={handleInputChange}
                                    placeholder="Enter new password"
                                    required
                                />
                                <span className="input-group-text">
                                    <i
                                        className={`fa ${showNewPassword ? "fa-eye" : "fa-eye-slash"
                                            }`}
                                        style={{ cursor: "pointer" }}
                                        onClick={toggleShowNewPassword}
                                    ></i>
                                </span>
                            </div>
                        </div>

                        <div className="mb-3">
                            <label htmlFor="confirmPassword" className="form-label">
                                Confirm Password <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    name="ConfirmPassword"
                                    value={formData.ConfirmPassword}
                                    className="form-control"
                                    onChange={handleInputChange}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck="false"
                                    placeholder="Confrim your password"
                                    required
                                />
                                <span className="input-group-text">
                                    <i
                                        className={`fa ${showConfirmPassword ? "fa-eye" : "fa-eye-slash"
                                            }`}
                                        style={{ cursor: "pointer" }}
                                        onClick={toggleShowConfirmPassword}
                                    ></i>
                                </span>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary w-100" disabled={frogotPWDBtnLoading}>
                            {frogotPWDBtnLoading ? 'Submitting...' : 'Submit'}
                        </button>
                    </form>

                    <form onSubmit={handleForgotEmail} className={`${dispalyEmail ? 'd-block' : 'd-none'}`}>
                        <div className="mb-3">
                            <label htmlFor="newPassword" className="form-label">
                                Email
                            </label>
                            <input
                                type="email"
                                placeholder="Enter email address"
                                value={forgotEmail}
                                className="form-control"
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck="false"
                                onChange={(e) => setForgotEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary w-100" disabled={forgotEmailBtnLoading}>
                            {forgotEmailBtnLoading ? 'Submitting...' : 'Submit'}
                        </button>
                    </form>

                    <form onSubmit={handleOTPSubmit} className={`${dispalyOTP ? 'd-block' : 'd-none'}`}>
                        <p>
                            An OTP has been sent to your registered email address:
                            <strong className="text-primary"> {maskEmail(forgotEmail)} </strong>
                        </p>
                        <p className="text-muted">
                            Please enter the 4-digit OTP below to continue. The OTP is valid for the next **5 minutes**.
                        </p>
                        <div className="mb-3">
                            <label htmlFor="newPassword" className="form-label">OTP</label>
                            <div className="mb-3 d-flex gap-2">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        ref={(ref) => (inputRefs.current[index] = ref)}
                                        type="text"
                                        maxLength="1"
                                        value={digit}
                                        onChange={(e) => handleChange(e.target.value, index)}
                                        onKeyDown={(e) => handleKeyDown(e, index)}
                                        className="form-control text-center"
                                        style={{
                                            width: "40px",
                                            height: "40px",
                                            fontSize: "20px",
                                            textAlign: "center",
                                            border: "2px solid #007bff",
                                            borderRadius: "5px",
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary w-100" disabled={forgotEmailBtnLoading}>
                            {forgotEmailBtnLoading ? 'Submitting...' : 'Submit'}
                        </button>
                    </form>
                </div>
            </div>

            <style>
                {`
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