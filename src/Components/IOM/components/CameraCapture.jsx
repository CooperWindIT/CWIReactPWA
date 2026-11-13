import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * Live camera with a Capture button (used in the Security "Upload container photo" modal).
 * - Uses the back camera on phones.
 * - On capture returns a JPEG File through onCapture(file).
 * - If the live camera can't open (needs HTTPS / permission), calls onUnavailable(message)
 *   so the parent can fall back to the phone's own camera (<input capture>).
 */
const CameraCapture = ({ onCapture, onCancel, onUnavailable }) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const [ready, setReady] = useState(false);
    const [facing, setFacing] = useState("environment");
    const [flash, setFlash] = useState(false);

    const stop = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }, []);

    useEffect(() => {
        let cancelled = false;

        const start = async () => {
            setReady(false);

            if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
                onUnavailable?.("Live camera needs HTTPS. Opening the phone camera instead.");
                return;
            }

            try {
                stop();
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
                    audio: false
                });
                if (cancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => { });
                }
                setReady(true);
            } catch (err) {
                console.error("Camera error:", err);
                onUnavailable?.("Camera permission was denied or no camera was found. Opening the phone camera instead.");
            }
        };

        start();
        return () => {
            cancelled = true;
            stop();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facing]);

    const capture = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

        setFlash(true);
        setTimeout(() => setFlash(false), 180);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
            const file = new File([blob], `container_${stamp}.jpg`, { type: "image/jpeg" });
            stop();
            onCapture(file);
        }, "image/jpeg", 0.85);
    };

    return (
        <div className="ir-cam">
            <div className="ir-cam-stage">
                <video ref={videoRef} playsInline muted autoPlay />
                {!ready && (
                    <div className="ir-cam-loading">
                        <span className="spinner-border spinner-border-sm" /> Opening camera…
                    </div>
                )}
                <span className="ir-cam-frame" />
                {flash && <span className="ir-cam-flash" />}
            </div>

            <div className="ir-cam-bar">
                <button type="button" className="ir-cam-side" onClick={() => { stop(); onCancel(); }} title="Cancel">
                    <i className="fa-solid fa-xmark" />
                </button>

                <button type="button" className="ir-cam-shutter" onClick={capture} disabled={!ready} title="Capture">
                    <span />
                </button>

                <button
                    type="button"
                    className="ir-cam-side"
                    onClick={() => setFacing(f => (f === "environment" ? "user" : "environment"))}
                    title="Switch camera"
                >
                    <i className="fa-solid fa-camera-rotate" />
                </button>
            </div>
        </div>
    );
};

export default CameraCapture;