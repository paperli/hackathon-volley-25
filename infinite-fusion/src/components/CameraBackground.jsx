import React, { useRef, useEffect, useState } from "react";
import { CameraContext } from "./CameraContext";

const CameraBackground = ({ children }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    const getCamera = async () => {
      setError(null);
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (active) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play();
          }
        }
      } catch {
        setError("Camera access denied or unavailable.");
      }
    };
    getCamera();
    return () => {
      active = false;
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <CameraContext.Provider value={{ stream, error, videoRef }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, width: "100vw", height: "100vh", overflow: "hidden" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            objectFit: "cover",
            zIndex: 0,
            background: "#000"
          }}
        />
        {/* Overlay a dark gradient for readability if needed */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 60%, rgba(0,0,0,0) 100%)", zIndex: 1 }} />
      </div>
      <div style={{ position: "relative", zIndex: 2, width: "100vw", height: "100vh", pointerEvents: "auto" }}>
        {children}
      </div>
      {error && (
        <div style={{ position: "fixed", top: 20, left: 0, width: "100vw", textAlign: "center", color: "#fff", background: "rgba(0,0,0,0.7)", zIndex: 1000, padding: 8 }}>
          {error}
        </div>
      )}
    </CameraContext.Provider>
  );
};

export default CameraBackground; 