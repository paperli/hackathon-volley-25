import React, { useState } from "react";
import { useGame } from "./GameContext";
import { requestImageGeneration, pollForImage } from '../utils/imageJob';

function GameScreen() {
  const { state, forgeObjects, completeTask, resetGame } = useGame();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [failedObject, setFailedObject] = useState<{ id: string; name: string } | null>(null);
  const [failedImageUrl, setFailedImageUrl] = useState("");
  const [failedCapability, setFailedCapability] = useState("");
  const [failedLoading, setFailedLoading] = useState(false);

  const metaEnv = (import.meta as ImportMeta & { env: any }).env;

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleForge = async () => {
    if (selectedIds.length < 2) return;
    // Predict the new forged object
    const newId = `fused-${selectedIds.join("-")}`;
    const newObj = {
      id: newId,
      name: selectedIds.map((id) => state.inventory.find((o) => o.id === id)?.name).join("-"),
      source: "forged",
      components: selectedIds,
    };
    // Check if this solves the current task
    const currentTask = state.tasks[state.currentTaskIndex];
    const solvesTask = currentTask?.requirements.every((req) =>
      [...state.inventory, newObj].some((o) => o.id === req)
    );
    if (!solvesTask) {
      setShowFailedModal(true);
      setFailedObject({ id: newObj.id, name: newObj.name });
      setFailedLoading(true);
      // Fetch image and capability (job-based flow)
      try {
        const [jobId, capRes] = await Promise.all([
          requestImageGeneration(newObj.name, metaEnv.VITE_BACKEND_URL),
          fetch(`${metaEnv.VITE_BACKEND_URL}/generate-capability`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objectName: newObj.name }),
          }),
        ]);
        const imageUrl = await pollForImage(jobId, metaEnv.VITE_BACKEND_URL);
        const capData = await capRes.json();
        setFailedImageUrl(imageUrl || "");
        setFailedCapability(capData.capability || "");
      } catch {
        setFailedImageUrl("");
        setFailedCapability("");
      } finally {
        setFailedLoading(false);
      }
      setSelectedIds([]);
      return;
    }
    // If successful, forge the object
    forgeObjects(selectedIds);
    setSelectedIds([]);
  };

  const currentTask = state.tasks[state.currentTaskIndex];

  // Failed Forge Modal
  const FailedForgeModal = () => (
    <div className="overlay">
      <div className="overlay-content overlay-center">
        <div className="overlay-card" style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ minHeight: 120, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {failedLoading ? (
              <div style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 50 50" style={{ display: 'block', margin: 'auto' }}>
                  <circle cx="25" cy="25" r="20" fill="none" stroke="#FFC145" strokeWidth="5" strokeDasharray="31.4 31.4" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>
            ) : failedImageUrl ? (
              <img src={failedImageUrl} alt={failedObject?.name} style={{ width: 96, height: 96, objectFit: 'contain', background: 'transparent' }} />
            ) : null}
          </div>
          <div style={{ color: '#FFC145', fontWeight: 600, fontSize: '1.1em' }}>You invented:</div>
          <div className="overlay-text" style={{ marginTop: 4, fontWeight: 700, color: '#FFC145', fontSize: '1.3em' }}>
            <b>{failedObject?.name || "a new object"}</b>
          </div>
          <div className="overlay-text" style={{ marginTop: 12, fontSize: '1.1em', color: '#fff' }}>
            {failedCapability
              ? `It can ${failedCapability}, but doesn't solve: ${currentTask?.description}`
              : "But it doesn't solve the current challenge!"}
          </div>
          <button
            onClick={() => setShowFailedModal(false)}
            style={{ marginTop: 24 }}
          >
            Forge Again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {showFailedModal && <FailedForgeModal />}
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
    </>
  );
}

export default GameScreen; 