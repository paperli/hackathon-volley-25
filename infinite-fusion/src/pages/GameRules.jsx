import React from 'react';
import { useNavigate } from 'react-router-dom';

const GameRules = ({ onStart }) => {
  // Use onStart prop if provided, otherwise fallback to navigation
  const navigate = useNavigate();
  const handleStart = () => {
    if (onStart) onStart();
    else navigate('/scan');
  };
  return (
    <div className="overlay-card" style={{ textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
      <h1 className="overlay-text">Welcome to Infinite Fusion</h1>
      <p className="overlay-text"><strong>Infinite Fusion</strong> is a creative web scavenger game that turns your real-world environment into a playground for discovery and invention!</p>
      <h2 className="overlay-text">Ready to Begin?</h2>
      <p className="overlay-text">Click <strong>Start Game</strong> to begin your adventure!</p>
      <button onClick={handleStart} style={{ padding: '0.75rem 2rem', fontSize: '1.1rem', marginTop: 16 }}>
        Start Game
      </button>
    </div>
  );
};

export default GameRules; 