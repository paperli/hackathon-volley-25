import React, { createContext, useContext, useState } from "react";
import { GameObject, GameTask, GameState } from "./types";

// Define the context value type
interface GameContextType {
  state: GameState & {
    roomScanImages: string[];
    gamePhase: "rules" | "scan" | "task" | "end";
    startTime?: number;
    endTime?: number;
    failedAttempts: number;
    currentScore: number;
  };
  setRoomScanImages: (images: string[]) => void;
  setInventory: (objects: GameObject[]) => void;
  setGamePhase: (phase: "rules" | "scan" | "task" | "end") => void;
  setStartTime: (t: number) => void;
  setEndTime: (t: number) => void;
  addObject: (obj: GameObject) => void;
  forgeObjects: (ids: string[]) => void;
  completeTask: () => void;
  resetGame: () => void;
  setTasks: (tasks: GameTask[]) => void;
  incrementFailedAttempts: () => void;
  calculateScore: () => number;
}

const initialObjects: GameObject[] = [];
const initialTasks: GameTask[] = [];

const initialState: GameState & {
  roomScanImages: string[];
  gamePhase: "rules" | "scan" | "task" | "end";
  startTime?: number;
  endTime?: number;
  failedAttempts: number;
  currentScore: number;
} = {
  inventory: initialObjects,
  tasks: initialTasks,
  currentTaskIndex: 0,
  roomScanImages: [],
  gamePhase: "rules",
  startTime: undefined,
  endTime: undefined,
  failedAttempts: 0,
  currentScore: 0,
};

const GameContext = createContext(undefined as unknown as GameContextType | undefined);

export const GameProvider = ({ children }: { children: any }) => {
  const [state, setState] = useState(initialState);

  const setRoomScanImages = (images: string[]) => {
    setState((prev) => ({ ...prev, roomScanImages: images }));
  };

  const setInventory = (objects: GameObject[]) => {
    setState((prev) => ({ ...prev, inventory: objects }));
  };

  const setGamePhase = (phase: "rules" | "scan" | "task" | "end") => {
    setState((prev) => ({ ...prev, gamePhase: phase }));
  };

  const setStartTime = (t: number) => {
    setState((prev) => ({ ...prev, startTime: t }));
  };

  const setEndTime = (t: number) => {
    setState((prev) => ({ ...prev, endTime: t }));
  };

  // Add a new object to inventory (if not already present)
  const addObject = (obj: GameObject) => {
    setState((prev) =>
      prev.inventory.some((o) => o.id === obj.id)
        ? prev
        : { ...prev, inventory: [...prev.inventory, obj] }
    );
  };

  // Forge objects: combine by ids, add new object if requirements met
  const forgeObjects = (ids: string[]) => {
    if (ids.length < 2) return;
    const allExist = ids.every((id) => state.inventory.some((o) => o.id === id));
    if (!allExist) return;
    const newId = `fused-${ids.join("-")}`;
    if (state.inventory.some((o) => o.id === newId)) return;
    const newObj: GameObject = {
      id: newId,
      name: ids.map((id) => state.inventory.find((o) => o.id === id)?.name).join("-"),
      source: "forged",
      components: ids,
    };
    setState((prev) => ({ ...prev, inventory: [...prev.inventory, newObj] }));
  };

  // Complete the current task if requirements are met
  const completeTask = () => {
    const currentTask = state.tasks[state.currentTaskIndex];
    if (!currentTask) return;
    const hasAll = currentTask.requirements.every((req) =>
      state.inventory.some((o) => o.id === req)
    );
    if (!hasAll) return;
    setState((prev) => {
      const updatedTasks = prev.tasks.map((t, i) =>
        i === prev.currentTaskIndex ? { ...t, solved: true } : t
      );
      return {
        ...prev,
        tasks: updatedTasks,
        currentTaskIndex:
          prev.currentTaskIndex < prev.tasks.length - 1
            ? prev.currentTaskIndex + 1
            : prev.currentTaskIndex,
      };
    });
  };

  const incrementFailedAttempts = () => {
    setState((prev) => ({ ...prev, failedAttempts: prev.failedAttempts + 1 }));
  };

  const calculateScore = () => {
    if (!state.startTime || !state.endTime) return 0;
    
    const N = state.inventory.length; // Number of objects
    const T = Math.floor((state.endTime - state.startTime) / 1000); // Time in seconds
    const failedAttempts = state.failedAttempts;
    
    // Base score: N * 1000
    const base = N * 1000;
    
    // Speed bonus
    let speedBonus = 0;
    if (T < 20) speedBonus = 500;
    else if (T < 40) speedBonus = 250;
    else if (T < 90) speedBonus = 100;
    
    // Penalty for failed attempts
    const penalty = failedAttempts * 100;
    
    // Final score
    const score = Math.round((base / (T + 10)) + speedBonus - penalty);
    
    return Math.max(0, score); // Ensure score is not negative
  };

  // Reset the game to initial state
  const resetGame = () => setState(initialState);

  // Set the list of tasks (for dynamic task generation)
  const setTasks = (tasks: GameTask[]) => {
    setState((prev) => ({ ...prev, tasks, currentTaskIndex: 0, failedAttempts: 0 }));
  };

  return (
    <GameContext.Provider
      value={{
        state,
        setRoomScanImages,
        setInventory,
        setGamePhase,
        setStartTime,
        setEndTime,
        addObject,
        forgeObjects,
        completeTask,
        resetGame,
        setTasks,
        incrementFailedAttempts,
        calculateScore,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within a GameProvider");
  return ctx;
}; 