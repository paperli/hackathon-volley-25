import React, { useState, useEffect, useRef } from "react";
import { useCameraStream } from "./CameraContext";
import { useGame } from "../game/GameContext";

const SCAN_URL = `${import.meta.env.VITE_BACKEND_URL}/analyze-scan`;
const TASK_GEN_URL = `${import.meta.env.VITE_BACKEND_URL}/generate-task`;
const NUM_CAPTURES = 4;

// Global hook for animated dot dot dot (e.g., for loading states)
function useDotDotDot(active = true, intervalMs = 400) {
  const [dots, setDots] = useState(1);
  const timer = useRef();
  useEffect(() => {
    if (!active) {
      setDots(1);
      return;
    }
    timer.current = setInterval(() => {
      setDots((d) => (d % 3) + 1);
    }, intervalMs);
    return () => clearInterval(timer.current);
  }, [active, intervalMs]);
  return '.'.repeat(dots);
}

// Utility to resize a dataUrl image to a target size
function resizeImage(dataUrl, targetWidth, targetHeight) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

const RoomScanOverlay = ({ setFusedName }) => {
  const { videoRef } = useCameraStream();
  const { setRoomScanImages, setInventory, setGamePhase, setTasks } = useGame();
  const [captures, setCaptures] = useState([]); // { image }
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const analyzingDots = useDotDotDot(analyzing);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    // Log original dimensions
    console.log(`[RoomScanOverlay] Original capture: ${canvas.width}x${canvas.height}`);
    // Resize to 256x256 before saving
    const resizedDataUrl = await resizeImage(dataUrl, 256, 256);
    // Log resized dimensions
    const tempImg = new window.Image();
    tempImg.onload = () => {
      console.log(`[RoomScanOverlay] Resized capture: ${tempImg.width}x${tempImg.height}`);
    };
    tempImg.src = resizedDataUrl;
    setCaptures((prev) => [...prev, { image: resizedDataUrl }]);
  };

  const handleRemoveCapture = (idx) => {
    setCaptures((prev) => prev.filter((_, i) => i !== idx));
    setError(null);
    setAnalyzing(false);
  };

  // Analyze images after all are captured (batch mode)
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      // Debug: Log image details before sending
      console.log("[RoomScanOverlay] Sending images to analyze-scan:");
      captures.forEach((c, idx) => {
        if (c && c.image) {
          console.log(`Image ${idx + 1}: length=${c.image.length}, first100='${c.image.slice(0, 100)}'`);
        } else {
          console.log(`Image ${idx + 1}: MISSING or INVALID`);
        }
      });
      console.log(`[RoomScanOverlay] Total images: ${captures.length}`);

      const response = await fetch(SCAN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: captures.map((c) => c.image) }),
      });
      const result = await response.json();
      // Debug: Log server response
      console.log("[RoomScanOverlay] /analyze-scan response:", result);
      const allObjects = result.objects || [];
      setRoomScanImages(captures.map((c) => c.image));
      setInventory(allObjects);
      if (allObjects.length >= 2) {
        const objectNames = allObjects.map(obj => obj.name);
        try {
          const response = await fetch(TASK_GEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objects: objectNames }),
          });
          const result = await response.json();
          if (result.task) {
            setTasks([result.task]);
            setGamePhase("task");
            if (setFusedName) setFusedName(result.fusedName || "");
          } else {
            setError(result.error || "Failed to generate task.");
          }
        } catch (err) {
          console.error("[RoomScanOverlay] Error generating task:", err);
          setError("Failed to generate task.");
        }
      } else {
        setError("Not enough objects detected to generate a task.");
      }
    } catch (err) {
      console.error("[RoomScanOverlay] Error analyzing images:", err);
      setError("Failed to analyze images.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Start analysis when all captures are done
  React.useEffect(() => {
    if (captures.length === NUM_CAPTURES) {
      handleAnalyze();
    }
    // eslint-disable-next-line
  }, [captures]);

  return (
    <div className="overlay bottom">
      <div className="overlay-content overlay-center-bottom" style={{ marginBottom: 120 }}>
        <div className="overlay-card compact" style={{ textAlign: "center" }}>
          <h2 className="overlay-text">Scan Your Room</h2>
          <p className="overlay-text">Take 4 photos around you to detect movable objects in your space.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "16px 0" }}>
            {[...Array(NUM_CAPTURES)].map((_, idx) => (
              <div key={idx} style={{ width: 56, height: 56, borderRadius: 8, background: "rgba(255,255,255,0.12)", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: 'relative' }}>
                {captures[idx] ? (
                  <>
                    <img src={captures[idx].image} alt={`Capture ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => handleRemoveCapture(idx)} className="remove-preview-btn">×</button>
                  </>
                ) : (
                  <span style={{ color: "#fff", opacity: 0.5 }}>{idx + 1}</span>
                )}
              </div>
            ))}
          </div>
          {error && <p className="overlay-text" style={{ color: "#ffb300" }}>{error}</p>}
          {analyzing && (
            <div style={{ marginTop: 24 }}>
              <h4 className="overlay-text">Analyzing Your Room{analyzingDots}</h4>
            </div>
          )}
        </div>
      </div>
      {/* Capture button at the bottom center */}
      {!analyzing && captures.length < NUM_CAPTURES && (
        <div className="overlay-content overlay-bottom">
          <button
            className="capture-btn"
            onClick={handleCapture}
            aria-label="Capture Room Photo"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default RoomScanOverlay; 