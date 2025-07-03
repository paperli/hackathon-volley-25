import React, { useState } from "react";
import { useGame } from "./GameContext";

function GameScreen() {
  const { state, forgeObjects, completeTask, resetGame } = useGame();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleForge = () => {
    forgeObjects(selectedIds);
    setSelectedIds([]);
  };

  const currentTask = state.tasks[state.currentTaskIndex];

  return (
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Inventory</h2>
      <ul>
        {state.inventory.map((obj) => (
          <li key={obj.id}>
            <label>
              <input
                type="checkbox"
                checked={selectedIds.includes(obj.id)}
                onChange={() => handleSelect(obj.id)}
              />
              {obj.name} ({obj.id}) [{obj.source}]
            </label>
          </li>
        ))}
      </ul>
      <button onClick={handleForge} disabled={selectedIds.length < 2} style={{ marginRight: 8 }}>
        Forge Selected
      </button>
      <button onClick={resetGame}>Reset Game</button>

      <hr />

      <h2>Current Task</h2>
      {currentTask ? (
        <div>
          <p>{currentTask.description}</p>
          {currentTask.solutionHint && (
            <p style={{ color: '#888', fontStyle: 'italic', marginTop: -12, marginBottom: 12 }}>
              {currentTask.solutionHint}
            </p>
          )}
          <p>
            Status: {currentTask.solved ? "Solved" : "Unsolved"}
          </p>
          <button
            onClick={completeTask}
            disabled={currentTask.solved}
            style={{ marginTop: 8 }}
          >
            Complete Task
          </button>
        </div>
      ) : (
        <p>All tasks complete! 🎉</p>
      )}

      <hr />

      <h2>All Tasks</h2>
      <ul>
        {state.tasks.map((task, idx) => (
          <li key={task.id} style={{ fontWeight: idx === state.currentTaskIndex ? "bold" : "normal" }}>
            {task.description} - {task.solved ? "Solved" : "Unsolved"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GameScreen; 