import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./game/GameContext";
import CameraBackground from "./components/CameraBackground";
import GameScreen from "./game/GameScreen";
import GameRules from "./pages/GameRules";

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <CameraBackground>
          <Routes>
            {/* Overlays will be implemented in each page/component */}
            <Route path="/" element={<GameRules />} />
            <Route path="/game" element={<GameScreen />} />
          </Routes>
        </CameraBackground>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;
