import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider, useGame } from "./game/GameContext";
import CameraBackground from "./components/CameraBackground";
import GameScreen from "./game/GameScreen";
import GameRules from "./pages/GameRules";
import RoomScanOverlay from "./components/RoomScanOverlay";
import TaskOverlay from "./components/TaskOverlay";

function OverlayManager() {
  const { state, setGamePhase, resetGame } = useGame();

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
    const durationSec = state.startTime && state.endTime ? ((state.endTime - state.startTime) / 1000).toFixed(1) : null;
    return (
      <div className="overlay">
        <div className="overlay-content overlay-center">
          <div className="overlay-card" style={{ textAlign: "center", maxWidth: 420 }}>
            <h2 className="overlay-text">🎉 Congratulations!</h2>
            <p className="overlay-text" style={{ fontWeight: 500, fontSize: '1.2em' }}>You completed the forging challenge!</p>
            {durationSec && (
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
            <button
              onClick={resetGame}
              style={{ marginTop: 24, padding: '0.75rem 2rem', fontSize: '1.1rem', background: '#FFC145', color: '#181c20', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
            >
              Play Again
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
