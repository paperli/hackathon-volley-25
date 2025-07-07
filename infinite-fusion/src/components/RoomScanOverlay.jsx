import React, { useState } from "react";
import { useCameraStream } from "./CameraContext";
import { useGame } from "../game/GameContext";

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_URL}/analyze`;
const TASK_GEN_URL = `${import.meta.env.VITE_BACKEND_URL}/generate-task`;
const NUM_CAPTURES = 4;

const RoomScanOverlay = () => {
  const { videoRef } = useCameraStream();
  const { setRoomScanImages, setInventory, setGamePhase, setTasks } = useGame();
  const [captures, setCaptures] = useState([]); // { image }
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setCaptures((prev) => [...prev, { image: dataUrl }]);
  };

  const handleRetake = () => {
    setCaptures([]);
    setError(null);
    setAnalyzing(false);
    setAnalyzeProgress(0);
  };

  // Analyze images after all are captured
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeProgress(0);
    setError(null);
    try {
      const results = await Promise.all(
        captures.map(async (c) => {
          try {
            const response = await fetch(BACKEND_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: c.image }),
            });
            const result = await response.json();
            setAnalyzeProgress((p) => p + 1);
            return result.objects || [];
          } catch {
            setAnalyzeProgress((p) => p + 1);
            return [];
          }
        })
      );
      // Deduplicate objects by name
      const allObjects = Array.from(
        new Map(
          results.flat().map((obj) => [obj.name, obj])
        ).values()
      );
      setRoomScanImages(captures.map((c) => c.image));
      setInventory(allObjects);
      // Generate a task using the detected objects
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
          } else {
            setError(result.error || "Failed to generate task.");
          }
        } catch {
          setError("Failed to generate task.");
        }
      } else {
        setError("Not enough objects detected to generate a task.");
      }
    } catch {
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
    <div className="overlay">
      <div className="overlay-content overlay-center">
        <div className="overlay-card" style={{ textAlign: "center" }}>
          <h2 className="overlay-text">Scan Your Room</h2>
          <p className="overlay-text">Take 4 photos around you to detect movable objects in your space.</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "16px 0" }}>
            {[...Array(NUM_CAPTURES)].map((_, idx) => (
              <div key={idx} style={{ width: 56, height: 56, borderRadius: 8, background: "rgba(255,255,255,0.12)", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {captures[idx] ? (
                  <img src={captures[idx].image} alt={`Capture ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: "#fff", opacity: 0.5 }}>{idx + 1}</span>
                )}
              </div>
            ))}
          </div>
          {error && <p className="overlay-text" style={{ color: "#ffb300" }}>{error}</p>}
          {analyzing && (
            <div style={{ marginTop: 24 }}>
              <h3 className="overlay-text">Analyzing Photos...</h3>
              <p className="overlay-text">{analyzeProgress} / {NUM_CAPTURES}</p>
            </div>
          )}
          {captures.length > 0 && !analyzing && (
            <button onClick={handleRetake} className="button-secondary" style={{ marginTop: 16 }}>Retake All Photos</button>
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