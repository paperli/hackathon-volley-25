import ReactGA from "react-ga4";
import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { GameProvider, useGame } from "./game/GameContext";
import CameraBackground from "./components/CameraBackground";
import GameScreen from "./game/GameScreen";
import GameRules from "./pages/GameRules";
import RoomScanOverlay from "./components/RoomScanOverlay";
import TaskOverlay from "./components/TaskOverlay";
import { requestImageGeneration, pollForImage } from './utils/imageJob';

ReactGA.initialize("G-2REY39T4EC");

function usePageViews() {
  const location = useLocation();
  React.useEffect(() => {
    ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
  }, [location]);
}

function OverlayManager() {
  const { state, setGamePhase, setTasks, setStartTime, setEndTime, calculateScore } = useGame();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [scoreExpanded, setScoreExpanded] = React.useState(false);
  const [fusedName, setFusedName] = React.useState("");
  const [fusedImageUrl, setFusedImageUrl] = React.useState("");
  const [fusedImageLoading, setFusedImageLoading] = React.useState(false);

  // New Play Again handler
  const handlePlayAgain = async () => {
    setLoading(true);
    setError("");
    try {
      const objectNames = state.inventory.map(obj => obj.name);
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/generate-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objects: objectNames }),
      });
      const result = await response.json();
      if (result.task) {
        setTasks([result.task]);
        setStartTime(Date.now());
        setEndTime(undefined);
        setGamePhase("task");
        setFusedName(result.fusedName || "");
      } else {
        setError(result.error || "Failed to generate new task.");
      }
    } catch {
      setError("Failed to generate new task.");
    } finally {
      setLoading(false);
    }
  };

  // Share handler
  const handleShare = () => {
    const shareText = fusedName
      ? `I invented ${fusedName} in #InfiniteFusion! It solves: ${state.tasks[state.currentTaskIndex]?.description}`
      : `I played #InfiniteFusion! It solves: ${state.tasks[state.currentTaskIndex]?.description}`;
    if (navigator.share) {
      navigator.share({
        title: 'Infinite Fusion',
        text: shareText,
        url: `${window.location.origin}${window.location.pathname}`
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      alert('Share text copied to clipboard!');
    } else {
      alert(shareText);
    }
  };

  // Generate image when fusedName changes and gamePhase is 'end'
  React.useEffect(() => {
    if (state.gamePhase === 'end' && fusedName) {
      setFusedImageUrl("");
      setFusedImageLoading(true);
      (async () => {
        try {
          const jobId = await requestImageGeneration(fusedName, import.meta.env.VITE_BACKEND_URL);
          const imageUrl = await pollForImage(jobId, import.meta.env.VITE_BACKEND_URL);
          setFusedImageUrl(imageUrl);
        } catch {
          setFusedImageUrl("");
        } finally {
          setFusedImageLoading(false);
        }
      })();
    }
  }, [state.gamePhase, fusedName]);

  // Handler to set loading false when image loads or fails
  const handleFusedImageLoad = () => setFusedImageLoading(false);
  const handleFusedImageError = () => setFusedImageLoading(false);

  // Simple spinner for loading states (copied from failed object modal)
  function Spinner() {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 64 }}>
        <div className="spinner" style={{ width: 36, height: 36, border: '4px solid #FFC145', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

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
    return <RoomScanOverlay setFusedName={setFusedName} />;
  }
  if (state.gamePhase === "task") {
    return <TaskOverlay />;
  }
  if (state.gamePhase === "end") {
    // Game End overlay
    const lastTask = state.tasks[state.currentTaskIndex] || state.tasks[state.currentTaskIndex - 1];
    const durationSec = state.startTime && state.endTime ? Math.floor((state.endTime - state.startTime) / 1000) : null;
    const score = calculateScore();
    const objectCount = state.inventory.length;
    // Calculate score breakdown for display
    const baseScore = objectCount * 1000;
    let speedBonus = 0;
    if (durationSec && durationSec < 20) speedBonus = 500;
    else if (durationSec && durationSec < 40) speedBonus = 250;
    else if (durationSec && durationSec < 90) speedBonus = 100;
    const penalty = state.failedAttempts * 100;

    // Title selection based on score
    function getEndTitle(score) {
      if (score >= 2500) return "Genius!";
      if (score >= 1500) return "Amazing!";
      if (score >= 800) return "Nice Work!";
      return "Not Bad!";
    }
    return (
      <div className="overlay">
        <div className="overlay-content overlay-center">
          <div className="overlay-card" style={{ textAlign: 'center', maxWidth: 420 }}>
            {lastTask && (
              <div>
                <h1 className="shine-title" style={{ margin: '0.2em 0', fontSize: '2.6em' }}>{getEndTitle(score)}</h1>
                <div style={{ color: '#FFC145', fontWeight: 600, fontSize: '1.1em' }}>You invented:</div>
                <div className="overlay-text" style={{ marginTop: 4, marginBottom: 12, fontWeight: 700, color: '#FFC145', fontSize: '1.3em' }}>
                  <b>{fusedName || "a new object"}</b>
                </div>
                {fusedImageLoading ? (
                  <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px auto' }}>
                    <Spinner />
                  </div>
                ) : fusedImageUrl ? (
                  <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '16px auto' }}>
                    <img
                      src={fusedImageUrl}
                      alt={fusedName}
                      style={{ width: 120, height: 120, objectFit: 'contain', display: 'block' }}
                      onLoad={handleFusedImageLoad}
                      onError={handleFusedImageError}
                    />
                  </div>
                ) : null}
                {/* Score Collapse Menu (moved here) */}
                <div style={{ margin: 0 }}>
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: '16px' }}>
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={scoreExpanded ? 'Collapse score details' : 'Expand score details'}
                      onClick={() => setScoreExpanded(!scoreExpanded)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { setScoreExpanded(!scoreExpanded); } }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        outline: 'none',
                        userSelect: 'none',
                      }}
                    >
                      <div style={{ color: '#FFC145', fontWeight: 700, fontSize: '1.5em', flex: 1, textAlign: 'center' }}>
                        Score: {score}
                      </div>
                      <span style={{ display: 'flex', alignItems: 'center', marginLeft: 8 }}>
                        <svg 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          style={{ 
                            transform: scoreExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </span>
                    </div>
                    {scoreExpanded && (
                      <div style={{ fontSize: '0.9em', color: '#ccc', textAlign: 'left', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                        <div>Objects: {objectCount} × 1000 = {baseScore}</div>
                        <div>Time: {durationSec}s</div>
                        <div>Speed Bonus: +{speedBonus}</div>
                        <div>Failed Attempts: -{penalty}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overlay-text" style={{ marginTop: 16, marginBottom: 0, fontSize: '1.1em', color: '#fff' }}>
                  {`That solves: ${lastTask.description}`}
                </div>
                <button
                  onClick={handleShare}
                  style={{ marginTop: 16, marginBottom: 8 }}
                  aria-label="Share your invention"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#181c20"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ verticalAlign: 'middle' }}
                      aria-hidden="true"
                    >
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    <span>Share</span>
                  </span>
                </button>
              </div>
            )}
            {error && <div style={{ color: '#ff4d4f', marginTop: 12 }}>{error}</div>}
            <button
              onClick={handlePlayAgain}
              style={{ marginTop: 4, opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Forge Another'}
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
