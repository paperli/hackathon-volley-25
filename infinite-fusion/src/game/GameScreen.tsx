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
    <div style={{ maxWidth: 500, margin: "2rem auto", padding: "var(--space-md)", border: `1px solid var(--color-border)`, borderRadius: "var(--radius)", background: "var(--color-bg-card)", color: "var(--color-text)" }} className="card">
      <h2>Inventory</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
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
      <button onClick={handleForge} disabled={selectedIds.length < 2} style={{ marginRight: "var(--space-sm)" }}>
        Forge Selected
      </button>
      <button onClick={resetGame} className="button-secondary">Reset Game</button>

      <hr style={{ borderColor: "var(--color-border)" }} />

      <h2>Current Task</h2>
      {currentTask ? (
        <div>
          <p>{currentTask.description}</p>
          {currentTask.solutionHint && (
            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: -12, marginBottom: 12 }}>
              {currentTask.solutionHint}
            </p>
          )}
          <p>
            Status: {currentTask.solved ? "Solved" : "Unsolved"}
          </p>
          <button
            onClick={completeTask}
            disabled={currentTask.solved}
            style={{ marginTop: "var(--space-xs)" }}
          >
            Complete Task
          </button>
        </div>
      ) : (
        <p>All tasks complete! 🎉</p>
      )}

      <hr style={{ borderColor: "var(--color-border)" }} />

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