import React from 'react';
import { useNavigate } from 'react-router-dom';

const GameRules = () => {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
      <main className="card" style={{ maxWidth: 600, margin: '2rem auto' }}>
        <h1>Welcome to Infinite Fusion</h1>
        <p><strong>Infinite Fusion</strong> is a creative web scavenger game that turns your real-world environment into a playground for discovery and invention!</p>
        <h2>How to Play</h2>
        <ol>
          <li>Use your device camera to scan your room. The game will analyze the images to detect movable objects.</li>
          <li>You'll receive fun tasks that challenge you to <strong>forge</strong> new objects by combining real items found in your space.</li>
          <li>Scan the objects you want to combine. The game will use advanced AI to verify and "forge" them into a new virtual object.</li>
          <li>Keep forging, solving tasks, and building your object library. The game tracks your progress and stats for competitive fun!</li>
        </ol>
        <h2>Privacy & Camera Usage</h2>
        <ul>
          <li>Your camera is used to capture images for gameplay. Images are analyzed by secure cloud AI (OpenAI or Gemini) to detect objects.</li>
          <li>Images may be sent to the cloud for analysis, but are not stored or shared beyond gameplay needs.</li>
          <li>We respect your privacy and use best practices to keep your data safe. You can review our full privacy policy at any time.</li>
        </ul>
        <h2>Ready to Begin?</h2>
        <p>Click <strong>Start Game</strong> to begin your adventure!</p>
        <button onClick={() => navigate('/camera')}>
          Start Game
        </button>
      </main>
    </div>
  );
};

export default GameRules; 