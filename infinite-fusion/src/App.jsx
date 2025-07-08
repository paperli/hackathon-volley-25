import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider, useGame } from "./game/GameContext";
import CameraBackground from "./components/CameraBackground";
import GameScreen from "./game/GameScreen";
import GameRules from "./pages/GameRules";
import RoomScanOverlay from "./components/RoomScanOverlay";
import TaskOverlay from "./components/TaskOverlay";

function OverlayManager() {
  const { state, setGamePhase, setTasks, setStartTime, setEndTime } = useGame();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

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
      } else {
        setError(result.error || "Failed to generate new task.");
      }
    } catch {
      setError("Failed to generate new task.");
    } finally {
      setLoading(false);
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
    return <RoomScanOverlay />;
  }
  if (state.gamePhase === "task") {
    return <TaskOverlay />;
  }
  if (state.gamePhase === "end") {
    // Game End overlay
    const lastTask = state.tasks[state.currentTaskIndex] || state.tasks[state.currentTaskIndex - 1];
    const durationSec = state.startTime && state.endTime ? Math.floor((state.endTime - state.startTime) / 1000) : null;
    return (
      <div className="overlay">
        <div className="overlay-content overlay-center">
          <div className="overlay-card" style={{ textAlign: "center", maxWidth: 420 }}>
            <h1>{getCheerIcon(durationSec)}</h1>
            <h1 className="overlay-text">{getCheerMessage(durationSec)}</h1>
            <p className="overlay-text" style={{ fontWeight: 500, fontSize: '1.2em' }}>You completed the forging challenge!</p>
            {durationSec !== null && (
              <div style={{ color: '#FFC145', fontWeight: 600, fontSize: '1.1em', margin: '12px 0' }}>
                Time taken: {durationSec} seconds
              </div>
            )}
            {lastTask && (
              <div style={{ margin: '18px 0' }}>
                <div style={{ color: '#FFC145', fontWeight: 600, fontSize: '1.1em' }}>Task:</div>
                <div className="overlay-text" style={{ marginTop: 4 }}>{lastTask.description}</div>
              </div>
            )}
            {error && <div style={{ color: '#ff4d4f', marginTop: 12 }}>{error}</div>}
            <button
              onClick={handlePlayAgain}
              style={{ marginTop: 24, padding: '0.75rem 2rem', fontSize: '1.1rem', background: '#FFC145', color: '#181c20', border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
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
