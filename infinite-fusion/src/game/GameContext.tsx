import React, { createContext, useContext, useState } from "react";
import { GameObject, GameTask, GameState } from "./types";

// Define the context value type
interface GameContextType {
  state: GameState;
  addObject: (obj: GameObject) => void;
  forgeObjects: (ids: string[]) => void;
  completeTask: () => void;
  resetGame: () => void;
  setTasks: (tasks: GameTask[]) => void;
}

const initialObjects: GameObject[] = [
  { id: "chair", name: "Chair", source: "detected" },
  { id: "table", name: "Table", source: "detected" },
];

const initialTasks: GameTask[] = [
  {
    id: "task-1",
    description: "Forge a new object using a chair and a table.",
    requirements: ["fused-chair-table"],
    solved: false,
  },
];

const initialState: GameState = {
  inventory: initialObjects,
  tasks: initialTasks,
  currentTaskIndex: 0,
};

const GameContext = createContext(undefined as unknown as GameContextType | undefined);

export const GameProvider = ({ children }: { children: any }) => {
  const [state, setState] = useState(initialState);

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

  // Reset the game to initial state
  const resetGame = () => setState(initialState);

  // Set the list of tasks (for dynamic task generation)
  const setTasks = (tasks: GameTask[]) => {
    setState((prev) => ({ ...prev, tasks, currentTaskIndex: 0 }));
  };

  return (
    <GameContext.Provider
      value={{ state, addObject, forgeObjects, completeTask, resetGame, setTasks }}
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