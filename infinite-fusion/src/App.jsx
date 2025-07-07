import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider, useGame } from "./game/GameContext";
import CameraBackground from "./components/CameraBackground";
import GameScreen from "./game/GameScreen";
import GameRules from "./pages/GameRules";
import RoomScanOverlay from "./components/RoomScanOverlay";
import TaskOverlay from "./components/TaskOverlay";

function OverlayManager() {
  const { state, setGamePhase } = useGame();

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
    // Placeholder for End overlay
    return (
      <div className="overlay">
        <div className="overlay-content overlay-center">
          <div className="overlay-card">
            <h2 className="overlay-text">Game End Overlay (Coming Soon)</h2>
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
