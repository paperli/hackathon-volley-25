import React from "react";
import { GameProvider } from "./game/GameContext";
import GameScreen from "./game/GameScreen";

function App() {
  return (
    <GameProvider>
      <GameScreen />
    </GameProvider>
  );
}

export default App; 