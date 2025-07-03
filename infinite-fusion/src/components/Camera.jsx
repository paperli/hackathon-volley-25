import React, { useRef, useEffect, useState } from 'react';

const BACKEND_URL = 'http://localhost:4000/analyze'; // Change to ngrok URL if needed

const Camera = ({ onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [objects, setObjects] = useState(null);
  const [loading, setLoading] = useState(false);

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
      setCaptured(dataUrl);
      setObjects(null);
      setLoading(true);
      try {
        const response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: dataUrl }),
        });
        const result = await response.json();
        setObjects(result.objects || []);
      } catch {
        setError('Failed to analyze image.');
        setObjects(null);
      } finally {
        setLoading(false);
      }
      if (onCapture) onCapture(dataUrl);
      console.log('Image captured and sent to backend.');
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>Camera</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div style={{ position: 'relative', display: 'inline-block', background: '#000' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ width: '100%', maxWidth: 400, borderRadius: 8, background: '#000', minHeight: 200 }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {!streaming && !error && <p style={{ color: '#888', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>Waiting for camera...</p>}
      </div>
      {streaming && (
        <div style={{ margin: '1rem 0' }}>
          <button onClick={handleCapture} style={{ padding: '0.5rem 1.5rem', fontSize: '1rem' }} disabled={loading}>
            {loading ? 'Analyzing...' : 'Capture'}
          </button>
        </div>
      )}
      {captured && (
        <div>
          <h3>Captured Image:</h3>
          <img src={captured} alt="Captured" style={{ maxWidth: 300, borderRadius: 8 }} />
        </div>
      )}
      {objects && (
        <div style={{ marginTop: 24 }}>
          <h3>Detected Objects:</h3>
          {objects.length === 0 ? (
            <p>No objects detected.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {objects.map((obj, idx) => (
                <li key={idx} style={{ margin: '0.5rem 0' }}>
                  <strong>{obj.name}</strong> (Confidence: {(obj.confidence * 100).toFixed(1)}%)
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p style={{ color: '#888', marginTop: 16 }}>If you see no video and no error, check browser permissions and try a different browser.</p>
    </div>
  );
};

export default Camera; 