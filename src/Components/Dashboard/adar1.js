import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import PropTypes from "prop-types";
import Swal from "sweetalert2";
import { CMMS_AADHAR_CHECKIN } from "../Config/Config";
import { Spin } from "antd";
import { fetchWithAuth, fetchWithAuthExternal } from "../../utils/api";

export default function AadhaarScanner({ checkType, conObj }) {

  const webcamRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [aadhaarNumber, setAadhaarNumber] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // or "user"
  const [statusMessage, setStatusMessage] = useState("");
  const [sessionUserData, setSessionUserData] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessLoading, setIsProcessLoading] = useState(false);
  const [checkinInCLs, setCheckInCLs] = useState(null);

  useEffect(() => {
    const userDataString = sessionStorage.getItem("userData");
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      setSessionUserData(userData);
    } else {
      console.log("User data not found in sessionStorage");
    }
  }, []);

  useEffect(() => {
    const offcanvasEl = document.getElementById("offcanvasRightChekOutCLScan");

    const handleShow = () => setIsCameraActive(true);
    const handleHide = () => {
      setIsCameraActive(false);
      setImageSrc(null);
      // setAadhaarNumber(null);
      setStatusMessage("");
    };

    offcanvasEl?.addEventListener("shown.bs.offcanvas", handleShow);
    offcanvasEl?.addEventListener("hidden.bs.offcanvas", handleHide);

    return () => {
      offcanvasEl?.removeEventListener("shown.bs.offcanvas", handleShow);
      offcanvasEl?.removeEventListener("hidden.bs.offcanvas", handleHide);
    };
  }, []);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };


  // Capture image from webcam
  const captureImage = () => {
    setImageSrc(null);
    setAadhaarNumber(null);

    const imageSrc = webcamRef.current?.getScreenshot();

    if (!imageSrc) {
      alert("Failed to capture image. Please try again or check camera access.");
      return;
    }

    setImageSrc(imageSrc); // optional: for preview

    // Convert base64 to Blob, then File
    const blob = dataURLtoBlob(imageSrc);
    const file = new File([blob], "captured.jpg", { type: "image/jpeg" });

    processImage(file);
  };

  const dataURLtoBlob = (dataUrl) => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const processImage = async (image) => {
    setStatusMessage("Processing image...");
    setIsProcessLoading(true);
  
    try {
      const formData = new FormData();
      formData.append("image", image);
  
      const response = await fetchWithAuthExternal(
        CMMS_AADHAR_CHECKIN,
        "extract_aadhaar",
        {
          method: "POST",
          body: formData, // ✅ correct
        }
      );
  
      const data = await response.json();
      if (data?.aadhaar) {
        const aadhaarNumber = data.aadhaar.replace(/\s/g, ""); // remove all spaces
        // alert(aadhaarNumber)
        checkInWithAadhaar(aadhaarNumber);
        setStatusMessage(`Aadhaar Number: ${aadhaarNumber}`);
      } else {
        setStatusMessage("No Aadhaar number found in the image.");
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setStatusMessage("Error while processing the image.");
    } finally {
      setIsProcessLoading(false);
    }
  };
  

  const checkInWithAadhaar = async (aadhaarNo) => {
    setStatusMessage("Verifying Aadhaar with server...");
    setIsProcessLoading(true);
    try {
      const response = await fetchWithAuth(`contractor/CLCheckIns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgid: sessionUserData?.OrgId,
          userid: sessionUserData?.Id || 1,
          ContractorId: conObj?.Id,
          AadharNo: aadhaarNo,
          ActionType: checkType,
        }),
      });

      const res = await response.json();

      if (response.ok && res.success) {
        const responseData = res.data.result[0];
        const { ResponseMessage, ResponseCode } = responseData;

        switch (ResponseCode) {
          case 1001:
          case 1002:
          case 1003:
          case 1004:
          case 1005:
          case 1007:
          case 1008:
          case 1011:
          case 1020:
            Swal.fire({
              icon: "warning",
              title: "Warning",
              text: ResponseMessage,
            });
            break;

          case 1006:
          case 1010:
            Swal.fire({
              icon: "success",
              title: "Successful",
              text: ResponseMessage,
            });
            break;

          case 1009:
            Swal.fire({
              icon: "question",
              title: "Confirmation Required",
              text: ResponseMessage,
              showCancelButton: true,
              confirmButtonText: "Yes, Proceed",
              cancelButtonText: "No, Cancel",
            }).then(async (result) => {
              if (result.isConfirmed) {
                try {
                  // Example payload for checkout update
                  const updatePayload = {
                    AadharNo: aadhaarNumber,
                    UpdatedBy: sessionUserData.Id,
                  };

                  const updateRes = await fetchWithAuth(`contractor/UpdateCLCheckOut`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updatePayload),
                  });

                  const updateJson = await updateRes.json();

                  if (updateRes.ok && updateJson?.ResultData?.Status === 'Success') {
                    Swal.fire({
                      icon: "success",
                      title: "Updated",
                      text: updateJson.ResultData.ResultMessage || "Check-out updated successfully!",
                    });
                  } else {
                    Swal.fire({
                      icon: "error",
                      title: "Update Failed",
                      text: updateJson.ResultData.ResultMessage || "Something went wrong.",
                    });
                  }
                } catch (err) {
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: err.message || "Something went wrong.",
                  });
                }
              }
            });
            break;

          default:
            Swal.fire({
              icon: "info",
              title: "Info",
              text: ResponseMessage || "Unknown response received.",
            });
            break;
        }
        setAadhaarNumber(null);
      } else {
        Swal.fire({
          icon: "error",
          title: "Check-In Failed",
          text: res.data?.result[0]?.ResponseMessage || "Unknown error occurred.",
        });
      }
    } catch (err) {
      setIsProcessLoading(false);
      console.error("API Error:", err);
      Swal.fire("Error", "Something went wrong while checking in.", "error");
      setStatusMessage("Network error while contacting the server.");
    }
  };

  const handleSubmitAadhar = async () => {
    setIsProcessLoading(true);

    try {
      const response = await fetchWithAuth(`contractor/CLCheckIns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgid: sessionUserData?.OrgId,
          userid: sessionUserData?.Id || 1,
          ContractorId: conObj?.Id,
          AadharNo: aadhaarNumber,
          ActionType: checkType,
        }),
      });

      const res = await response.json();
      setAadhaarNumber(null);
      setIsProcessLoading(false);

      if (response.ok && res.success) {
        const responseData = res.data.result[0];
        const { ResponseMessage, ResponseCode } = responseData;

        switch (ResponseCode) {
          case 1001:
          case 1002:
          case 1003:
          case 1004:
          case 1005:
          case 1007:
          case 1008:
          case 1011:
          case 1020:
            Swal.fire({
              icon: "warning",
              title: "Warning",
              text: ResponseMessage,
            });
            break;

          case 1006:
          case 1010:
            Swal.fire({
              icon: "success",
              title: "Successful",
              text: ResponseMessage,
            });
            break;

          case 1009:
            Swal.fire({
              icon: "question",
              title: "Confirmation Required",
              text: ResponseMessage,
              showCancelButton: true,
              confirmButtonText: "Yes, Proceed",
              cancelButtonText: "No, Cancel",
            }).then(async (result) => {
              if (result.isConfirmed) {
                try {
                  // Example payload for checkout update
                  const updatePayload = {
                    AadharNo: aadhaarNumber,
                    UpdatedBy: sessionUserData.Id,
                  };

                  const updateRes = await fetchWithAuth(`contractor/UpdateCLCheckOut`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(updatePayload),
                  });

                  const updateJson = await updateRes.json();

                  if (updateRes.ok && updateJson?.ResultData?.Status === 'Success') {
                    Swal.fire({
                      icon: "success",
                      title: "Updated",
                      text: updateJson.ResultData.ResultMessage || "Check-out updated successfully!",
                    });
                  } else {
                    Swal.fire({
                      icon: "error",
                      title: "Update Failed",
                      text: updateJson.ResultData.ResultMessage || "Something went wrong.",
                    });
                  }
                } catch (err) {
                  Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: err.message || "Something went wrong.",
                  });
                }
              }
            });
            break;

          default:
            Swal.fire({
              icon: "info",
              title: "Info",
              text: ResponseMessage || "Unknown response received.",
            });
            break;
        }
        setAadhaarNumber(null);
      } else {
        Swal.fire({
          icon: "error",
          title: "Check-In Failed",
          text: res.data?.result[0]?.ResponseMessage || "Unknown error occurred.",
        });
      }
    } catch (error) {
      setIsProcessLoading(false);
      console.error("AadharCheckInOut Error:", error);
      Swal.fire({
        icon: "error",
        title: "Network Error",
        text: error.message || "Something went wrong while connecting to the server.",
      });
    }
  };

  return (
    
    <div
      className={`offcanvas offcanvas-end`}
      tabIndex="-1"
      id="offcanvasRightChekOutCLScan"
      aria-labelledby="offcanvasRightLabel"
      style={{ width: '90%' }}
    >
      {isProcessLoading && (
  <div className="loading-overlay">
    <Spin size="large" />
  </div>
)}
      <style>
        {`
          @media (min-width: 768px) { /* Medium devices and up (md) */
              #offcanvasRightChekOutCLScan {
                  width: 40% !important;
              }

          }
          .blink-badge {
            animation: blink 1.2s infinite;
          }
           .blurred {
  filter: blur(2px);
  pointer-events: none; /* disables clicks inside the form */
}

/* Full screen overlay */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.6); /* semi-transparent */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999; /* make sure it’s on top */
}

          @keyframes blink {
            0%, 50%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            25%, 75% {
              opacity: 0.5;
              transform: scale(1.05);
            }
          }
        `}
      </style>
      <form className={isProcessLoading ? "blurred" : ""}>
        <div className="offcanvas-header d-flex justify-content-between align-items-center mb-2">
          <h5 id="offcanvasRightLabel" className="mb-0 d-flex align-items-center gap-2">
            <span
              className={`
                fs-2 fw-bold px-3 py-2 rounded-pill 
                ${checkType === "CHECKOUT"
                            ? "bg-light-danger text-danger"
                            : "bg-light-success text-success"
                          } 
                blink-badge
              `}
            >
              {checkType || ""}
            </span>
          </h5>

          <div className="d-flex align-items-center">
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
              onClick={() => setAadhaarNumber(null)}
            ></button>
          </div>
        </div>
        <hr className="text-primary" />
        <div className="offcanvas-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingBottom: '2rem',
            maxHeight: 'calc(100vh - 100px)',
            marginTop: '-2rem'
          }}
        >
          <div>
            <h3 className="text-center">Aadhaar Card Scanner</h3>
            <div className="card p-3 shadow-sm border-0">
              <div className="card-body">
                <h5 className="card-title text-primary fw-bold">Contractor Details</h5>
                <hr />
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Name</label>
                    <div className="bg-light p-2 rounded text-dark fw-medium">
                      {conObj?.ContractorName || "N/A"}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Mobile No</label>
                    <div className="bg-light p-2 rounded text-dark fw-medium">
                      {conObj?.PhoneNumber || "N/A"}
                    </div>
                  </div>
                </div>
                <div className="row mt-2 d-flex">
                  <div className="col-10">
                    <label className="form-label">Aadhar No:</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Enter Aadhar number"
                      // value={aadhaarNumber?.replace(/(.{4})/g, "$1 ").trim()} // Format for display
                      value={
                        aadhaarNumber
                          ? aadhaarNumber.replace(/(.{4})/g, "$1 ").trim()
                          : "" // ✅ fallback to empty string
                      }
                      onChange={(e) => {
                        setStatusMessage("");
                        let raw = e.target.value.replace(/\D/g, ""); // Remove non-digits
                        if (raw.length > 12) raw = raw.slice(0, 12);
                        setAadhaarNumber(raw); // Store unformatted
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                        }
                      }}
                      onWheel={(e) => e.target.blur()}
                      maxLength={14} // 12 digits + 2 spaces
                      disabled={isProcessLoading}
                    />
                  </div>
                  <div className="col-2 d-flex align-items-end">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={handleSubmitAadhar}
                      type="button"
                      disabled={isProcessLoading}
                    >
                      <i className="bi bi-person-check fs-3"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {statusMessage && 
              <div className="text-center my-4">
                <p className="text-info fw-semibold">*{statusMessage}</p>
              </div>
            }
            
            {isCameraActive && (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode }}
                style={{ width: "100%", height: "300px", objectFit: "cover" }}
              />
            )}

            <button
              type="button"
              onClick={toggleCamera}
              className="btn btn-secondary d-flex m-auto mt-2 btn-sm"
              disabled={isProcessLoading}
            >
              <i className="fa-solid fa-camera-rotate mt-1 fs-4"></i>Switch to {facingMode === "user" ? "Back" : "Front"} Camera
            </button>


            <button type="button" className="btn btn-primary d-flex m-auto mt-4 btn-sm"
              disabled={isProcessLoading}
              onClick={captureImage}><i className="fa-solid fa-camera mt-1 fs-4"></i>Capture Image</button>
            {imageSrc && <img src={imageSrc} alt="Captured" style={{ marginTop: "10px", width: '100%', height: '300px' }} />}

          </div>
        </div>
      </form>
    </div>
  );
};


AadhaarScanner.propTypes = {
  conObj: PropTypes.object.isRequired,
  checkType: PropTypes.string.isRequired
};