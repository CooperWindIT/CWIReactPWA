import React, { useEffect, useState } from "react";
import QrScanner from "react-qr-scanner";
import { VMS_VISITORS } from "../Config/Config";

export default function PassCheckIn() {
    const [sessionUserData, setSessionUserData] = useState({});
    const [scannedData, setScannedData] = useState("");
    const [lastProcessedData, setLastProcessedData] = useState(""); 
    const [status, setStatus] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [facingMode, setFacingMode] = useState("environment");
    const [enterPassNo, setEnterPassNo] = useState("");

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        }
    }, []);

    const removeLeadingZeros = (passNo) => {
        return passNo.replace(/^00/, '');
    };

    const handleSubmit = async () => {
        if (!enterPassNo) return;
        setSubmitLoading(true);
        const payload = {
            OrgId: sessionUserData.OrgId,
            VisitorId: removeLeadingZeros(enterPassNo),
            UserId: sessionUserData.Id,
        };

        try {
            const response = await fetch(`${VMS_VISITORS}QrCheckinCheckOut`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            setSubmitLoading(false);
            setStatus(result[0]?.ResponseMessage);
            // console.log(result[0]);
        } catch (error) {
            setSubmitLoading(false);
            console.error("API Error:", error);
            setStatus("❌ Error occurred. Please try again.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleResult = async (result) => {
        if (!result || isProcessing || result.text === lastProcessedData) return;
        
        setScannedData(result.text);
        setIsProcessing(true);
        setLastProcessedData(result.text);

        const payload = {
            OrgId: sessionUserData.OrgId,
            VisitorId: result.text,
            UserId: sessionUserData.Id,
        };

        try {
            const response = await fetch(`${VMS_VISITORS}QrCheckinCheckOut`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            setStatus(result[0]?.ResponseMessage || '✅ Success!');
        } catch (error) {
            console.error("API Error:", error);
            setStatus("❌ Error occurred. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStartScanning = () => {
        setScannedData(null);
        setIsScanning(true);  
        setStatus("");     
    };

    const handleStopScanning = () => {
        setIsScanning(false); 
        setStatus(""); 
    };

    // const toggleCamera = () => {
    //     // setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    //     setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    // };

    const toggleCamera = () => {
        // Toggle the facing mode
        setFacingMode(prev => (prev === "user" ? "environment" : "user"));
        // Force a remount: stop scanning momentarily and restart.
        setIsScanning(false);
        setTimeout(() => setIsScanning(true), 100); // adjust the delay if needed
    };
    

    return (
        <div className="offcanvas offcanvas-end" id="offcanvasRightPassCheckIn" aria-labelledby="offcanvasRightLabel">
            <div className="offcanvas-header">
                <h5>QR Code Check-In/Out</h5>
                <button className="btn-close" data-bs-dismiss="offcanvas" onClick={handleStopScanning}></button>
            </div>

            <div className="offcanvas-body">
                <label className="form-label">Pass Number:</label>
                <input 
                    type="text"
                    className="form-control" 
                    placeholder="Enter Pass no. Ex: 1234"
                    value={enterPassNo} 
                    onChange={(e) => setEnterPassNo(e.target.value)} 
                />

                <div className="mt-3 d-flex">
                    <button className="btn btn-primary me-2" onClick={handleStartScanning} disabled={isProcessing}>Scan QR Code</button>
                    <button 
                        className="btn btn-success" 
                        type="button"
                        disabled={submitLoading}
                        onClick={handleSubmit}
                    >{submitLoading ? 'Submitting...' : 'Submit'}</button>
                    {isScanning && (
                        <button className="btn btn-secondary ms-2" onClick={toggleCamera}>Switch Camera</button>
                    )}
                </div>

                {isScanning && (
                    <QrScanner
                        key={facingMode}
                        // key={`${facingMode}-${isScanning}`}
                        delay={300}
                        onScan={handleResult}
                        onError={(err) => console.error(err)}
                        facingMode={facingMode}
                        style={{ width: "100%", marginTop: '20px', borderRadius: '8px' }}
                    />
                )}

                {status && <h6 className={`mt-3 ${status.includes('❌') ? 'text-danger' : 'text-success'}`}>{status}</h6>}
            </div>
        </div>
    );
}
