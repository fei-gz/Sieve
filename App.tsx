import React, { useState, useEffect } from 'react';
import { GamePhase } from './types';
import GameWorld from './components/GameWorld';
import { Play, RotateCw, Trophy } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const TOTAL_LEVELS = 20;

export default function App() {
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.MENU);
  const [mysticQuote, setMysticQuote] = useState("Sift the shadows, find the core.");

  useEffect(() => {
    const fetchQuote = async () => {
      if (!process.env.API_KEY) return;
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'Generate a one-sentence mystical zen proverb about a sieve, stones and beans. No attribution, no quotation marks.',
        });
        if (response.text) {
          setMysticQuote(response.text.trim());
        }
      } catch (err) {
        console.error("Gemini API Error:", err);
      }
    };
    if (phase === GamePhase.MENU) {
      fetchQuote();
    }
  }, [phase]);

  const startGame = async () => {
    // Immediate feedback
    setPhase(GamePhase.PLAYING);
    
    // Attempt fullscreen safely (iOS Safari often ignores this on body/doc)
    try {
      const doc = document.documentElement as any;
      if (doc.requestFullscreen) {
        doc.requestFullscreen().catch(() => {});
      } else if (doc.webkitRequestFullscreen) {
        doc.webkitRequestFullscreen();
      }
    } catch (e) {
      // Ignore fullscreen errors
    }
    
    // Request motion permission for iOS 13+
    const DeviceOrientation = (window as any).DeviceOrientationEvent;
    if (DeviceOrientation && typeof DeviceOrientation.requestPermission === 'function') {
      try {
        await DeviceOrientation.requestPermission();
      } catch (e) {
        console.warn("Motion permission denied:", e);
      }
    }
  };

  const handleLevelComplete = () => {
    setPhase(GamePhase.LEVEL_COMPLETE);
  };

  const nextLevel = () => {
    if (level >= TOTAL_LEVELS) {
      setLevel(1);
      setPhase(GamePhase.MENU);
    } else {
      setLevel(prev => prev + 1);
      setPhase(GamePhase.PLAYING);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-900 text-white font-sans overflow-hidden">
      
      {/* 3D Game Layer - Only load when not in menu to save resources */}
      {phase !== GamePhase.MENU && (
        <GameWorld 
          level={level} 
          onLevelComplete={handleLevelComplete}
          isPaused={phase !== GamePhase.PLAYING}
        />
      )}

      {/* UI Overlays */}
      {phase === GamePhase.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20 p-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-600 text-center">
            Sieve & Stones
          </h1>
          <p className="text-orange-300 italic mb-4 max-w-md text-center text-sm md:text-lg animate-pulse">
            "{mysticQuote}"
          </p>
          <p className="text-gray-400 mb-8 max-w-md text-center text-xs md:text-sm">
            Shake your device to gather the stones.<br/>
            Weld them together, then clear the beans!
          </p>
          <button 
            onClick={startGame}
            className="flex items-center gap-2 px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-full text-xl font-bold transition-transform active:scale-95 shadow-lg shadow-orange-900/40"
          >
            <Play fill="currentColor" /> Start Game
          </button>
          <p className="mt-6 text-xs text-gray-500 text-center">
            Tilt your phone to sway the sieve.
          </p>
        </div>
      )}

      {phase === GamePhase.LEVEL_COMPLETE && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-30 p-4">
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl text-center max-w-xs w-full">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Level {level} Clear!</h2>
            <button 
              onClick={nextLevel}
              className="mt-4 px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors w-full"
            >
              {level === TOTAL_LEVELS ? 'Restart Game' : 'Next Level'}
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {phase === GamePhase.PLAYING && (
        <div className="absolute top-6 left-6 z-10 pointer-events-none select-none">
          <div className="text-xl font-bold drop-shadow-lg">LVL {level}</div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
             Physics: ACTIVE
          </div>
        </div>
      )}
    </div>
  );
}