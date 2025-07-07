import React, { useState } from "react";
import { useCameraStream } from "./CameraContext";
import { useGame } from "../game/GameContext";

const BACKEND_URL = `${import.meta.env.VITE_BACKEND_URL}/analyze`;

const TaskOverlay = () => {
  const { videoRef } = useCameraStream();
  const { state, setGamePhase, setEndTime, completeTask } = useGame();
  const [captures, setCaptures] = useState([null, null]); // [{ image, object }, { image, object }]
  const [activeIdx, setActiveIdx] = useState(0); // 0 or 1
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [forgeError, setForgeError] = useState(null);

  const currentTask = state.tasks[state.currentTaskIndex];

  const handleCapture = async () => {
    setError(null);
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setAnalyzing(true);
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const result = await response.json();
      const detected = (result.objects || [])[0];
      if (!detected) {
        setError("No object detected. Try again.");
        setAnalyzing(false);
        return;
      }
      setCaptures((prev) => {
        const next = [...prev];
        next[activeIdx] = { image: dataUrl, object: detected };
        return next;
      });
      setActiveIdx((idx) => (idx === 0 ? 1 : 0));
    } catch {
      setError("Failed to analyze image.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRetake = (idx) => {
    setCaptures((prev) => {
      const next = [...prev];
      next[idx] = null;
      return next;
    });
    setActiveIdx(idx);
    setForgeError(null);
  };

  const handleForge = () => {
    setForgeError(null);
    if (!captures[0] || !captures[1]) return;
    const ids = [captures[0].object.name, captures[1].object.name];
    // Check if the captured objects match the task requirements (order-insensitive)
    const reqs = currentTask.requirements.slice().sort();
    const selected = ids.slice().sort();
    if (JSON.stringify(reqs) === JSON.stringify(selected)) {
      completeTask();
      setEndTime(Date.now());
      setGamePhase("end");
    } else {
      setForgeError("Those objects can't be forged for this task. Try again!");
    }
  };

  return (
    <div className="overlay">
      <div className="overlay-content overlay-center">
        <div className="overlay-card" style={{ textAlign: "center", maxWidth: 420 }}>
          <h2 className="overlay-text">Task</h2>
          <p className="overlay-text" style={{ fontWeight: 500 }}>{currentTask?.description}</p>
          {currentTask?.solutionHint && (
            <p className="overlay-text" style={{ color: '#ffe1a8', fontStyle: 'italic', fontSize: '0.95em' }}>{currentTask.solutionHint}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0' }}>
            {/* Left thumbnail */}
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 12, position: 'relative' }}>
              {captures[0] ? (
                <>
                  <img src={captures[0].image} alt="Object 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => handleRetake(0)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 14, cursor: 'pointer' }}>×</button>
                </>
              ) : (
                <span style={{ color: '#fff', opacity: 0.5 }}>1</span>
              )}
            </div>
            {/* Cross icon */}
            <div style={{ margin: '0 12px', color: '#fff', fontSize: 32, fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>×</div>
            {/* Right thumbnail */}
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginLeft: 12, position: 'relative' }}>
              {captures[1] ? (
                <>
                  <img src={captures[1].image} alt="Object 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => handleRetake(1)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: 14, cursor: 'pointer' }}>×</button>
                </>
              ) : (
                <span style={{ color: '#fff', opacity: 0.5 }}>2</span>
              )}
            </div>
          </div>
          {error && <p className="overlay-text" style={{ color: '#ffb300' }}>{error}</p>}
          {forgeError && <p className="overlay-text" style={{ color: '#ff4d4f' }}>{forgeError}</p>}
          {analyzing && <p className="overlay-text">Analyzing...</p>}
        </div>
      </div>
      {/* Capture button at the bottom center, only if not analyzing and not both captured */}
      {!analyzing && captures.some((c) => !c) && (
        <div className="overlay-content overlay-bottom">
          <button
            className="capture-btn"
            onClick={handleCapture}
            aria-label={`Capture Object ${activeIdx + 1}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /></svg>
          </button>
        </div>
      )}
      {/* Forge button at the bottom center, only if both captured */}
      {!analyzing && captures.every((c) => c) && (
        <div className="overlay-content overlay-bottom">
          <button
            className="capture-btn"
            style={{ background: '#FFC145', color: '#181c20' }}
            onClick={handleForge}
            aria-label="Forge Objects"
          >
            Forge
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskOverlay; 