import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import GameRules from './pages/GameRules.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameRules />} />
        {/* Add more routes here as the app grows */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
); 