import React, { useEffect, useState } from "react";
import { QrReader } from "react-qr-reader";
import { VMS_VISITORS } from "../Config/Config";

export default function PassCheckIn() {
    const [sessionUserData, setSessionUserData] = useState({});
    const [showScanner, setShowScanner] = useState(false);
    const [scannedData, setScannedData] = useState("");
    const [lastProcessedData, setLastProcessedData] = useState("");  // 🔒 New State for Tracking Previous Data
    const [status, setStatus] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.error("User data not found in sessionStorage");
        }
    }, []);

    const handleResult = async (result, error) => {
        if (!result || isProcessing) return; // ✅ Prevent multiple requests

        const qrData = result.text;

        // 🔒 Prevent processing the same QR data repeatedly
        if (qrData === lastProcessedData) return; 

        setScannedData(qrData);
        setLastProcessedData(qrData); // ✅ Track processed QR code
        setShowScanner(false);
        setIsProcessing(true);

        const payload = {
            OrgId: sessionUserData.OrgId,
            VisitorId: qrData,
            UserId: sessionUserData.Id,
        };

        try {
            const response = await fetch(`${VMS_VISITORS}QrCheckinCheckOut`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            // console.log(result, "API Response");

            if (response.ok) {
                setIsProcessing(false);
                setStatus(`${result[0]?.ResponseMessage || '✅ Success!'}`);
            } else {
                setIsProcessing(false);
                setStatus("❌ Failed to check in/out. Please try again.");
            }
        } catch (error) {
            setIsProcessing(false);
            console.error("Error during API call:", error.message);
            setStatus("❌ Error occurred. Please try again.");
        } finally {
            // 🔒 Introduce a 2-second delay to ensure stability
            setTimeout(() => {
                setIsProcessing(false); 
            }, 200000);
        }
    };

    const startScanning = () => {
        setScannedData("");
        setLastProcessedData(""); // ✅ Reset previously processed data
        setShowScanner(true);
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightPassCheckIn"
            aria-labelledby="offcanvasRightLabel"
        >
            <div className="offcanvas-header">
                <h5>QR Code Check-In/Out</h5>
                <button
                    type="button"
                    className="btn-close text-reset"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                ></button>
            </div>

            <div className="offcanvas-body" style={{ marginTop: "-2rem" }}>
                <div>
                    <label className="form-label">Pass Number:</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Enter Pass Number"
                        value={scannedData}
                        onChange={(e) => setScannedData(e.target.value)}
                    />
                </div>

                <div className="mt-3 d-flex">
                    <button className="btn btn-success" disabled={isProcessing}>
                        Submit
                    </button>
                    <button
                        className="btn btn-primary ms-2"
                        onClick={startScanning}
                        disabled={isProcessing}
                    >
                        Scan QR Code
                    </button>
                </div>

                {showScanner && (
                    <QrReader
                        constraints={{ facingMode: "environment" }}
                        onResult={handleResult}
                        style={{ width: "100%" }}
                    />
                )}

                {status && (
                    <h6 className={`mt-3 ${status.includes('❌') ? 'text-danger' : 'text-success'}`}>
                        {status}
                    </h6>
                )}
            </div>
        </div>
    );
}
