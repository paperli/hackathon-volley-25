import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import GameRules from './pages/GameRules.jsx';
import Camera from './components/Camera.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameRules />} />
        <Route path="/camera" element={<Camera />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
