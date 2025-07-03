import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GameProvider } from "./game/GameContext";
import Camera from "./components/Camera";
import GameScreen from "./game/GameScreen";
import GameRules from "./pages/GameRules";

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<GameRules />} />
          <Route path="/camera" element={<Camera />} />
          <Route path="/game" element={<GameScreen />} />
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;
