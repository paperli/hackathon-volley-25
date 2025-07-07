import React, { useState, useEffect, useRef } from "react";
import { useCameraStream } from "./CameraContext";
import { useGame } from "../game/GameContext";

const ANSWER_URL = `${import.meta.env.VITE_BACKEND_URL}/analyze-answer`;
const TASK_GEN_URL = `${import.meta.env.VITE_BACKEND_URL}/generate-task`;

// Generate a creative fusion name from two object names
function getCreativeFusionName(a, b) {
  const templates = [
    `${a}${b.slice(0, 2)}`,
    `${b}${a.slice(0, 2)}`,
    `The ${a}${b}`,
    `${a}-${b} 3000`,
    `Mega${a}${b}`,
    `${a}${b}inator`,
    `Ultra ${a} ${b}`,
    `The ${a} of ${b}`,
    `${a}${b}`.replace(/(.)([A-Z])/g, '$1 $2'),
    `${a}${b}`.toLowerCase(),
    `${a}${b}`.toUpperCase(),
    `${a}${b}`.split('').reverse().join(''),
    `${a}${b}`.replace(/[aeiou]/gi, ''),
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

// Fuzzy match two strings based on shared tokens
function fuzzyMatch(a, b) {
  const tokenize = str => str.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  const shared = tokensA.filter(token => tokensB.includes(token));
  return shared.length / ((tokensA.length + tokensB.length) / 2);
}

// Returns true if all selected match requirements (order-insensitive, one-to-one, fuzzy)
function isFuzzyForge(selected, requirements, threshold = 0.7) {
  const reqs = [...requirements];
  for (const sel of selected) {
    const idx = reqs.findIndex(req => fuzzyMatch(sel, req) >= threshold);
    if (idx === -1) return false;
    reqs.splice(idx, 1);
  }
  return reqs.length === 0;
}

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

const TaskOverlay = () => {
  const { videoRef } = useCameraStream();
  const { state, setGamePhase, setEndTime, setStartTime, completeTask, setTasks } = useGame();
  const [captures, setCaptures] = useState([null, null]); // [{ image, object }, { image, object }]
  const [activeIdx, setActiveIdx] = useState(0); // 0 or 1
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [forgeError, setForgeError] = useState(null);
  const [fadeError, setFadeError] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [forgeDebug, setForgeDebug] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const analyzingDots = useDotDotDot(analyzing);

  const currentTask = state.tasks[state.currentTaskIndex];
  const inventoryNames = state.inventory.map(obj => obj.name);

  // Auto-dismiss error toast after 2 seconds, with fade-out in last 400ms
  useEffect(() => {
    if (error) {
      setFadeError(false);
      const fadeTimer = setTimeout(() => setFadeError(true), 1600);
      const timer = setTimeout(() => setError(null), 2000);
      return () => {
        clearTimeout(timer);
        clearTimeout(fadeTimer);
      };
    } else {
      setFadeError(false);
    }
  }, [error]);

  // Live timer for task phase
  useEffect(() => {
    let interval;
    if (state.gamePhase === 'task' && state.startTime && !state.endTime) {
      const update = () => setElapsed(Math.floor((Date.now() - state.startTime) / 1000));
      update();
      interval = setInterval(update, 100);
    } else if (state.endTime && state.startTime) {
      setElapsed(Math.floor((state.endTime - state.startTime) / 1000));
    } else {
      setElapsed(0);
    }
    return () => interval && clearInterval(interval);
  }, [state.gamePhase, state.startTime, state.endTime]);

  // Ensure startTime is set when entering task phase
  useEffect(() => {
    if (state.gamePhase === 'task' && !state.startTime) {
      setStartTime(Date.now());
    }
  }, [state.gamePhase, state.startTime, setStartTime]);

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
      const response = await fetch(ANSWER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl, inventory: inventoryNames }),
      });
      const result = await response.json();
      const detected = (result.objects || [])[0];
      if (!detected) {
        setError("Detection failed. No object recognized. Please try again.");
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
    setForgeDebug(null);
  };

  const handleForge = () => {
    setForgeError(null);
    if (!captures[0] || !captures[1]) return;
    const ids = [captures[0].object.name, captures[1].object.name];
    // Fuzzy match selected objects to requirements (order-insensitive, one-to-one)
    if (isFuzzyForge(ids, currentTask.requirements)) {
      completeTask();
      setEndTime(Date.now());
      setGamePhase("end");
    } else {
      const fusionName = getCreativeFusionName(captures[0].object.name, captures[1].object.name);
      setForgeError(`Those objects can't be forged for this task, but you created: ${fusionName}! Try again or experiment with more combinations!`);
      setForgeDebug({
        requirements: currentTask.requirements,
        selected: [captures[0].object, captures[1].object],
        fusionName,
      });
    }
  };

  // Regenerate a new task
  const handleRefreshTask = async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const objectNames = state.inventory.map(obj => obj.name);
      const response = await fetch(TASK_GEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objects: objectNames }),
      });
      const result = await response.json();
      if (result.task) {
        setTasks([result.task]);
        setShowHint(false);
        setCaptures([null, null]);
        setForgeError(null);
        setForgeDebug(null);
      } else {
        setRefreshError(result.error || "Failed to generate task.");
      }
    } catch {
      setRefreshError("Failed to generate task.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="overlay">
      <div className="overlay-content overlay-center">
        <div className="overlay-card" style={{ textAlign: "center", maxWidth: 420 }}>
          <h2 className="overlay-text" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Task
            <button
              onClick={handleRefreshTask}
              disabled={refreshing}
              style={{
                background: 'none',
                border: 'none',
                marginLeft: 8,
                cursor: refreshing ? 'not-allowed' : 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                opacity: refreshing ? 0.5 : 1,
              }}
              aria-label="Regenerate Task"
            >
              {refreshing ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFC145" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spin"><circle cx="12" cy="12" r="10"/><path d="M4 12a8 8 0 0 1 8-8"/></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFC145" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10M1 14l5.37 5.37A9 9 0 0 0 20.49 15"/></svg>
              )}
            </button>
          </h2>
          {state.gamePhase === 'task' && (
            <div style={{ color: '#FFC145', fontWeight: 600, fontSize: '1.1em', margin: '4px 0 10px 0', textAlign: 'center' }}>
              {elapsed}s
            </div>
          )}
          <p className="overlay-text" style={{ fontWeight: 500 }}>{currentTask?.description}</p>
          {currentTask?.solutionHint && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFC145',
                textDecoration: 'underline',
                cursor: 'pointer',
                fontSize: '1em',
                margin: '8px 0',
                fontWeight: 500,
              }}
            >
              Hint
            </button>
          )}
          {currentTask?.solutionHint && showHint && (
            <p className="overlay-text" style={{ color: '#ffe1a8', fontStyle: 'italic', fontSize: '0.95em', marginTop: 8 }}>{currentTask.solutionHint}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px 0' }}>
            {/* Left thumbnail */}
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.12)', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginRight: 12, position: 'relative' }}>
              {captures[0] ? (
                <>
                  <img src={captures[0].image} alt="Object 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => handleRetake(0)} className="remove-preview-btn">×</button>
                  <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 13, padding: '2px 4px', borderRadius: 6, textAlign: 'center' }}>{captures[0].object?.name}</div>
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
                  <button onClick={() => handleRetake(1)} className="remove-preview-btn">×</button>
                  <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 13, padding: '2px 4px', borderRadius: 6, textAlign: 'center' }}>{captures[1].object?.name}</div>
                </>
              ) : (
                <span style={{ color: '#fff', opacity: 0.5 }}>2</span>
              )}
            </div>
          </div>
          {error && <div style={{ position: 'fixed', top: 24, left: 0, right: 0, zIndex: 9999, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div
              style={{
                background: '#ff4d4f',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: 8,
                fontWeight: 500,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                opacity: fadeError ? 0 : 1,
                transition: 'opacity 400ms',
                pointerEvents: 'auto',
              }}
            >
              {error}
            </div>
          </div>}
          {forgeError && <>
            <p className="overlay-text" style={{ color: '#ff4d4f' }}>{forgeError}</p>
            {forgeDebug && forgeDebug.fusionName && (
              <div style={{ background: 'rgba(255,255,255,0.07)', color: '#fff', borderRadius: 8, padding: '10px 16px', margin: '8px 0', fontSize: 15, textAlign: 'center', fontWeight: 600 }}>
                <span>Fusion Result: </span>{forgeDebug.fusionName}
              </div>
            )}
          </>}
          {analyzing && (
            <div style={{ margin: '12px 0', color: '#fff', fontWeight: 600, fontSize: '1.1em' }}>
              Analyzing{analyzingDots}
            </div>
          )}
          {refreshError && <div style={{ color: '#ff4d4f', fontWeight: 500, margin: '8px 0' }}>{refreshError}</div>}
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
            ⚒️
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskOverlay; 