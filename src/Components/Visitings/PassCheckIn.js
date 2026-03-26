import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { fetchWithAuth } from "../../utils/api";

export default function PassCheckIn() {
  const [sessionUserData, setSessionUserData] = useState({});
  // const [scannedData, setScannedData] = useState("");
  const [lastProcessedData, setLastProcessedData] = useState("");
  const [status, setStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [enterPassNo, setEnterPassNo] = useState("");
  const [enterEmail, setEnterEmail] = useState('');

  const scannerRef = useRef(null);
  const qrCodeRegionId = "html5qr-code-full-region";

  useEffect(() => {
    const userDataString = sessionStorage.getItem("userData");
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      setSessionUserData(userData);
    }
  }, []);

  const handleSubmit = async () => {
    if (!enterPassNo && !enterEmail) return;
  
    setSubmitLoading(true);
    setStatus('');
  
    const payload = {
      OrgId: sessionUserData.OrgId,
      VisitorId: enterPassNo || 0,
      Email: enterEmail || null,
      UserId: sessionUserData.Id,
    };
  
    try {
      const response = await fetchWithAuth(`visitor/QrCheckinCheckOut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      const resultRes = await response.json();
      setStatus(resultRes.data.result[0]?.ResponseMessage);
  
      setEnterPassNo('');
      setEnterEmail('');
    } catch (error) {
      console.error("API Error:", error);
      setStatus("❌ Error occurred. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResult = async ({ text }) => {
    if (!text || isProcessing || text === lastProcessedData) return;

    // setScannedData(text);
    setIsProcessing(true);
    setLastProcessedData(text);

    const payload = {
      OrgId: sessionUserData.OrgId,
      VisitorId: text,
      Email: enterEmail || null,
      UserId: sessionUserData.Id,
    };

    try {
      const response = await fetchWithAuth(`visitor/QrCheckinCheckOut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resultRes = await response.json();
      setStatus(resultRes.data.result[0]?.ResponseMessage);
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("API Error:", error);
      setStatus("❌ Error occurred. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const startScanner = () => {
    const qrRegion = document.getElementById(qrCodeRegionId);
    if (!qrRegion) {
      console.warn(`Element with id=${qrCodeRegionId} not found.`);
      return;
    }
  
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(qrCodeRegionId);
    }
  
    Html5Qrcode.getCameras()
      .then((devices) => {
        const cameraId =
          devices.find((device) =>
            facingMode === "user"
              ? device.label.toLowerCase().includes("front")
              : device.label.toLowerCase().includes("back")
          )?.id || devices[0]?.id;
  
        if (cameraId) {
          scannerRef.current
            .start(
              cameraId,
              { fps: 10, qrbox: 250 },
              (decodedText) => {
                handleResult({ text: decodedText });
                stopScanner();
              },
              (errorMessage) => {
                console.warn("Scan error", errorMessage);
              }
            )
            .catch((err) => {
              console.error("Start camera error:", err);
            });
        }
      })
      .catch((err) => {
        console.error("Error accessing camera:", err);
      });
  };
  
  // const stopScanner = () => {
  //   scannerRef.current?.stop().then(() => {
  //     Html5Qrcode.clear();
  //   });
  // };

  const stopScanner = () => {
    setStatus("");
    scannerRef.current?.stop().then(() => {
      scannerRef.current.clear();
    }).catch((err) => {
      console.error("Stop camera error:", err);
    });
  };
  

  const handleStartScanning = () => {
    // setScannedData(null);
    setIsScanning(true);
    setStatus("");
    startScanner();
  };

  // const handleStopScanning = () => {
  //   setIsScanning(false);
  //   setStatus("");
  //   stopScanner();
  // };

  const toggleCamera = () => {
    stopScanner();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  useEffect(() => {
    if (isScanning) {
      const timeout = setTimeout(() => {
        startScanner();
      }, 200); // delay ensures DOM is rendered
  
      return () => clearTimeout(timeout);
    } else {
      stopScanner();
    }
  }, [isScanning, facingMode]);
  

  return (
    <div
      className="offcanvas offcanvas-end"
      id="offcanvasRightPassCheckIn"
      aria-labelledby="offcanvasRightLabel"
    >
      <div className="offcanvas-header">
        <h5>QR Code Check-In/Out</h5>
        <button
          className="btn-close"
          data-bs-dismiss="offcanvas"
          onClick={stopScanner}
        ></button>
      </div>

      <div className="offcanvas-body">
        <label className="form-label">Pass Number:</label>
        <input
          type="text"
          className="form-control"
          placeholder="Enter Pass no. Ex: 1234"
          value={enterPassNo}
          onChange={(e) => setEnterPassNo(e.target.value)}
          disabled={submitLoading || isProcessing || enterEmail.length > 0}
          style={{ height: '2.8rem' }}
        />

        <label className="form-label mt-3">Email:</label>
        <input
          type="email"
          className="form-control"
          placeholder="Enter Email"
          value={enterEmail}
          onChange={(e) => setEnterEmail(e.target.value)}
          disabled={submitLoading || isProcessing || enterPassNo.length > 0}
          style={{ height: '2.8rem' }}
        />

        <div className="mt-3 d-flex">
          <button
            className="btn btn-primary me-2 btn-sm"
            onClick={handleStartScanning}
            disabled={isProcessing || submitLoading}
          >
            <i class="bi bi-qr-code-scan"></i>Scan QR Code
          </button>
          <button
            className="btn btn-success btn-sm"
            type="button"
            disabled={submitLoading || isProcessing}
            onClick={handleSubmit}
          >
            <i class="bi bi-check2-all"></i>{submitLoading ? "Submitting..." : "Submit"}
          </button>
          {isScanning && (
            <button className="btn btn-secondary ms-2 btn-sm" onClick={toggleCamera}>
              <i class="bi bi-camera"></i>Switch Camera
            </button>
          )}
        </div>

        {isScanning && (
          <div
            id={qrCodeRegionId}
            style={{ width: "100%", marginTop: "20px", borderRadius: "8px" }}
          />
        )}

        {status && (
          <h6
            className={`mt-3 ${status.includes("❌") ? "text-danger" : "text-success"}`}
          >
            {status}
          </h6>
        )}
      </div>
    </div>
  );
}
