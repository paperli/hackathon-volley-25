import React from 'react';
import { useNavigate } from 'react-router-dom';

const GameRules = ({ onStart }) => {
  // Use onStart prop if provided, otherwise, fallback to navigation
  const navigate = useNavigate();
  const handleStart = () => {
    if (onStart) onStart();
    else navigate('/scan');
  };
  return (
    <div className="overlay-card" style={{ textAlign: 'center', maxWidth: 400 }}>
      <h1 style={{ marginBottom: 0 }}>⚒️</h1>
      <h1 className="game-title overlay-text">Infinite Fusion</h1>
      <p className="overlay-text">Fuse real stuff. Solve wild tasks. Surprise yourself!</p>
      <button onClick={handleStart} style={{ padding: '0.75rem 1.5rem', fontSize: '1.2rem', textTransform: 'uppercase', fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
      Start Forging
      </button>
    </div>
  );
};

export default GameRules; 