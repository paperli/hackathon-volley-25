import React, { useRef, useEffect, useState } from 'react';
import { useGame } from '../game/GameContext';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = 'http://192.168.50.38:4000/analyze'; // Change to ngrok URL if needed
const TASK_GEN_URL = 'http://192.168.50.38:4000/generate-task'; // New endpoint for task generation

const NUM_CAPTURES = 4;

const Camera = ({ onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [captures, setCaptures] = useState([]); // { image }
  const [analyzedCaptures, setAnalyzedCaptures] = useState([]); // { image, objects }
  const [currentStep, setCurrentStep] = useState(0); // 0-based index
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [loading, setLoading] = useState(false); // for capture only
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState(null);
  const [generatedTask, setGeneratedTask] = useState(null);

  const { addObject, setTasks } = useGame();
  const navigate = useNavigate();

  useEffect(() => {
    const getCamera = async () => {
      setError(null);
      try {
        console.log('Requesting camera...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setStreaming(true);
            console.log('Camera stream started.');
          };
        }
      } catch (err) {
        setError('Camera access denied or unavailable.');
        console.error('getUserMedia error:', err);
      }
    };
    getCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setCaptures(prev => [...prev, { image: dataUrl }]);
      setCurrentStep(prev => prev + 1);
      if (onCapture) onCapture(dataUrl);
    }
  };

  const handleRetake = () => {
    setCaptures([]);
    setAnalyzedCaptures([]);
    setCurrentStep(0);
    setTaskError(null);
    setGeneratedTask(null);
    setAnalyzing(false);
    setAnalyzeProgress(0);
  };

  // After all photos are taken, analyze them in parallel
  useEffect(() => {
    if (currentStep === NUM_CAPTURES && captures.length === NUM_CAPTURES) {
      setAnalyzing(true);
      setAnalyzeProgress(0);
      setAnalyzedCaptures([]);
      Promise.all(
        captures.map(async (c, idx) => {
          try {
            const response = await fetch(BACKEND_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: c.image }),
            });
            const result = await response.json();
            setAnalyzeProgress(p => p + 1);
            return { image: c.image, objects: result.objects || [] };
          } catch {
            setAnalyzeProgress(p => p + 1);
            return { image: c.image, objects: [] };
          }
        })
      ).then(results => {
        setAnalyzedCaptures(results);
        setAnalyzing(false);
      });
    }
  }, [currentStep, captures]);

  // Merge all detected objects (deduplicate by name)
  const allObjects = Array.from(
    new Map(
      analyzedCaptures.flatMap(c => c.objects).map(obj => [obj.name, obj])
    ).values()
  );

  const handleStartGame = async () => {
    if (allObjects.length > 1) {
      allObjects.forEach(obj => {
        addObject({
          id: obj.name,
          name: obj.name,
          source: 'detected',
        });
      });
      setTaskLoading(true);
      setTaskError(null);
      setGeneratedTask(null);
      try {
        const response = await fetch(TASK_GEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objects: allObjects.map(obj => obj.name) }),
        });
        const result = await response.json();
        if (result.task) {
          setTasks([result.task]);
          setGeneratedTask(result.task);
          navigate('/game');
        } else {
          setTaskError(result.error || 'Failed to generate task.');
        }
      } catch (err) {
        setTaskError('Failed to generate task.');
      } finally {
        setTaskLoading(false);
      }
    }
  };

  return (
    <div style={{ textAlign: 'center', background: 'var(--color-bg)', color: 'var(--color-text)', minHeight: '100vh' }}>
      <h2>Room Panorama Capture</h2>
      {error && <p style={{ color: 'var(--color-accent)' }}>{error}</p>}
      <p>Spin slowly in a circle. We'll ask you to take {NUM_CAPTURES} photos to capture your whole room.</p>
      <div style={{ position: 'relative', display: 'inline-block', background: 'var(--color-bg-card)' }} className="card">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', maxWidth: 400, borderRadius: 'var(--radius)', background: 'var(--color-bg-card)', minHeight: 200 }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {!streaming && !error && <p style={{ color: 'var(--color-text-muted)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Waiting for camera...</p>}
      </div>
      {streaming && currentStep < NUM_CAPTURES && (
        <div style={{ margin: 'var(--space-md) 0' }}>
          <h3>Photo {currentStep + 1} of {NUM_CAPTURES}</h3>
          <button onClick={handleCapture} style={{ padding: '0.5rem 1.5rem', fontSize: 'var(--font-size-md)' }} disabled={loading}>
            {loading ? 'Saving...' : 'Capture'}
          </button>
        </div>
      )}
      {captures.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <h3>Captured Photos</h3>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {captures.map((c, idx) => (
              <img key={idx} src={c.image} alt={`Capture ${idx + 1}`} style={{ maxWidth: 80, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
            ))}
          </div>
        </div>
      )}
      {analyzing && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <h3>Analyzing Photos...</h3>
          <p>Analyzing {analyzeProgress} / {NUM_CAPTURES}</p>
        </div>
      )}
      {!analyzing && analyzedCaptures.length === NUM_CAPTURES && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <h3>Detected Objects (from all photos):</h3>
          {allObjects.length === 0 ? (
            <p>No objects detected.</p>
          ) : (
            <>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {allObjects.map((obj, idx) => (
                  <li key={idx} style={{ margin: '0.5rem 0' }}>
                    <strong>{obj.name}</strong> (Confidence: {(obj.confidence * 100).toFixed(1)}%)
                  </li>
                ))}
              </ul>
              <button
                onClick={handleStartGame}
                style={{ marginTop: 'var(--space-md)', padding: '0.5rem 1.5rem', fontSize: 'var(--font-size-md)' }}
                disabled={taskLoading}
              >
                {taskLoading ? 'Generating Task...' : 'Start Game'}
              </button>
              {taskError && <p style={{ color: 'var(--color-accent)' }}>{taskError}</p>}
              <button onClick={handleRetake} className="button-secondary" style={{ marginLeft: 'var(--space-md)' }}>Retake All Photos</button>
            </>
          )}
        </div>
      )}
      <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-md)' }}>If you see no video and no error, check browser permissions and try a different browser.</p>
    </div>
  );
};

export default Camera; 