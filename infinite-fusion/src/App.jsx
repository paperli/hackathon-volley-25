import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider, useGame } from "./game/GameContext";
import CameraBackground from "./components/CameraBackground";
import GameScreen from "./game/GameScreen";
import GameRules from "./pages/GameRules";
import RoomScanOverlay from "./components/RoomScanOverlay";
import TaskOverlay from "./components/TaskOverlay";

function OverlayManager() {
  const { state, setGamePhase, setTasks, setStartTime, setEndTime, calculateScore } = useGame();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [scoreExpanded, setScoreExpanded] = React.useState(false);
  const [fusedName, setFusedName] = React.useState("");

  // Adjustable cheer message parameters
  const cheerThresholds = [20, 40, 90];
  const cheerIcons = ["🚀", "🔨", "🏅", "😴"];
  const cheerMessages = [
    "Blazing Fast!",
    "Speedy Smith!",
    "Solid Work!",
    "You took your time..."
  ];

  function getCheerMessage(durationSec, thresholds = cheerThresholds, messages = cheerMessages) {
    if (durationSec == null) return "Congratulations!";
    for (let i = 0; i < thresholds.length; i++) {
      if (durationSec < thresholds[i]) return messages[i];
    }
    return messages[messages.length - 1];
  }

  function getCheerIcon(durationSec, icons = cheerIcons) {
    if (durationSec == null) return cheerIcons[0];
    for (let i = 0; i < cheerThresholds.length; i++) {
      if (durationSec < cheerThresholds[i]) return icons[i];
    }
    return icons[icons.length - 1];
  }

  // New Play Again handler
  const handlePlayAgain = async () => {
    setLoading(true);
    setError("");
    try {
      const objectNames = state.inventory.map(obj => obj.name);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objects: objectNames }),
      });
      const result = await response.json();
      if (result.task) {
        setTasks([result.task]);
        setStartTime(Date.now());
        setEndTime(undefined);
        setGamePhase("task");
        setFusedName(result.fusedName || "");
      } else {
        setError(result.error || "Failed to generate new task.");
      }
    } catch {
      setError("Failed to generate new task.");
    } finally {
      setLoading(false);
    }
  };

  // Share handler
  const handleShare = () => {
    const shareText = fusedName
      ? `I invented "${fusedName}" in Infinite Fusion! The challenge: ${state.tasks[state.currentTaskIndex]?.description}`
      : `I played Infinite Fusion! The challenge: ${state.tasks[state.currentTaskIndex]?.description}`;
    if (navigator.share) {
      navigator.share({
        title: 'Infinite Fusion',
        text: shareText,
        url: window.location.origin
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      alert('Share text copied to clipboard!');
    } else {
      alert(shareText);
    }
  };

  if (state.gamePhase === "rules") {
    return (
      <div className="overlay">
        <div className="overlay-content overlay-center">
          <GameRules onStart={() => setGamePhase("scan")} />
        </div>
      </div>
    );
  }
  if (state.gamePhase === "scan") {
    return <RoomScanOverlay setFusedName={setFusedName} />;
  }
  if (state.gamePhase === "task") {
    return <TaskOverlay />;
  }
  if (state.gamePhase === "end") {
    // Game End overlay
    const lastTask = state.tasks[state.currentTaskIndex] || state.tasks[state.currentTaskIndex - 1];
    const durationSec = state.startTime && state.endTime ? Math.floor((state.endTime - state.startTime) / 1000) : null;
    const score = calculateScore();
    const objectCount = state.inventory.length;
    // Find the last forged object
    const lastForged = [...state.inventory].reverse().find(obj => obj.source === 'forged');
    // Calculate score breakdown for display
    const baseScore = objectCount * 1000;
    let speedBonus = 0;
    if (durationSec && durationSec < 20) speedBonus = 500;
    else if (durationSec && durationSec < 40) speedBonus = 250;
    else if (durationSec && durationSec < 90) speedBonus = 100;
    const penalty = state.failedAttempts * 100;
    return (
      <div className="overlay">
        <div className="overlay-content overlay-center">
          <div className="overlay-card" style={{ textAlign: "center", maxWidth: 420 }}>
            <h1 style={{ marginBottom: 0 }}>{getCheerIcon(durationSec)}</h1>
            <h1 className="game-title overlay-text">{getCheerMessage(durationSec)}</h1>
            <p className="overlay-text" style={{ fontWeight: 500, fontSize: '1.2em' }}>You completed the forging challenge!</p>
            {/* Score Display */}
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px', margin: '16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ color: '#FFC145', fontWeight: 700, fontSize: '1.5em' }}>
                  Score: {score}
                </div>
                <button
                  onClick={() => setScoreExpanded(!scoreExpanded)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#FFC145',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    style={{ 
                      transform: scoreExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              {scoreExpanded && (
                <div style={{ fontSize: '0.9em', color: '#ccc', textAlign: 'left', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                  <div>Objects: {objectCount} × 1000 = {baseScore}</div>
                  <div>Time: {durationSec}s</div>
                  <div>Speed Bonus: +{speedBonus}</div>
                  <div>Failed Attempts: -{penalty}</div>
                </div>
              )}
            </div>
            {/* Forged object and task description */}
            {lastTask && (
              <div style={{ margin: '18px 0' }}>
                <div style={{ color: '#FFC145', fontWeight: 600, fontSize: '1.1em' }}>You invented:</div>
                <div className="overlay-text" style={{ marginTop: 4, fontWeight: 700, color: '#FFC145', fontSize: '1.3em' }}>
                  <b>{fusedName || "a new object"}</b>
                </div>
                <div className="overlay-text" style={{ marginTop: 8, fontSize: '1.1em', color: '#fff' }}>
                  {`That solves: ${lastTask.description}`}
                </div>
                <button
                  onClick={handleShare}
                  style={{ marginTop: 16 }}
                >
                  Share
                </button>
              </div>
            )}
            {error && <div style={{ color: '#ff4d4f', marginTop: 12 }}>{error}</div>}
            <button
              onClick={handlePlayAgain}
              style={{ marginTop: 4, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Forge Another'}
            </button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <CameraBackground>
          <OverlayManager />
          {/* The following routes are kept for future extensibility, but overlays control the main flow */}
          <Routes>
            <Route path="/" element={null} />
            <Route path="/game" element={<GameScreen />} />
          </Routes>
        </CameraBackground>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;
