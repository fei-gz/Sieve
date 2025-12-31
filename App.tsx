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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      if (!process.env.API_KEY) return;
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'Generate a very short one-sentence mystical zen proverb about a sieve, stones and beans. No attribution, no quotation marks.',
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
    setLoading(true);
    
    // Request motion permission for iOS 13+
    const DeviceOrientation = (window as any).DeviceOrientationEvent;
    if (DeviceOrientation && typeof DeviceOrientation.requestPermission === 'function') {
      try {
        const permissionState = await DeviceOrientation.requestPermission();
        if (permissionState !== 'granted') {
          console.warn("Motion permission not granted");
        }
      } catch (e) {
        console.error("Error requesting motion permission:", e);
      }
    }

    // Attempt to handle full screen or address bar hiding via scroll
    try {
      window.scrollTo(0, 1);
    } catch (e) {}

    // Final transition
    setPhase(GamePhase.PLAYING);
    setLoading(false);
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
    <div className="relative w-full h-full bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center">
      
      {/* 3D Game Layer */}
      {phase !== GamePhase.MENU && (
        <div className="absolute inset-0 w-full h-full z-0">
          <GameWorld 
            level={level} 
            onLevelComplete={handleLevelComplete}
            isPaused={phase !== GamePhase.PLAYING}
          />
        </div>
      )}

      {/* UI Overlays */}
      {phase === GamePhase.MENU && (
        <div className="relative z-20 w-full h-full flex flex-col items-center justify-center bg-gray-950 p-6 md:p-12 overflow-y-auto">
          <div className="max-w-md w-full text-center space-y-6">
            <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-amber-200 to-orange-600">
              SIEVE
              <span className="block text-3xl md:text-4xl font-light tracking-widest text-orange-400 mt-1">AND STONES</span>
            </h1>
            
            <div className="py-4 border-y border-orange-900/30">
              <p className="text-orange-200/80 italic text-sm md:text-base leading-relaxed">
                "{mysticQuote}"
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-gray-400 text-xs md:text-sm uppercase tracking-widest leading-relaxed">
                GATHER THE STONES BY SHAKING.<br/>
                ONCE WELDED, PURGE THE BEANS.
              </p>
              
              <button 
                onClick={startGame}
                disabled={loading}
                className="group relative inline-flex items-center gap-3 px-10 py-5 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-800 rounded-full text-xl font-bold transition-all active:scale-95 shadow-2xl shadow-orange-900/40 w-full md:w-auto justify-center"
              >
                {loading ? (
                  <RotateCw className="animate-spin" />
                ) : (
                  <>
                    <Play className="fill-current" />
                    <span>START JOURNEY</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-8 flex flex-col items-center gap-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Controls</p>
              <div className="flex gap-4 text-xs text-gray-400">
                <span className="px-2 py-1 bg-white/5 rounded border border-white/10">MOBILE: TILT</span>
                <span className="px-2 py-1 bg-white/5 rounded border border-white/10">PC: MOUSE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === GamePhase.LEVEL_COMPLETE && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30 p-4 backdrop-blur-sm">
          <div className="bg-gray-900 p-10 rounded-3xl border border-gray-800 shadow-2xl text-center max-w-sm w-full transform animate-in fade-in zoom-in duration-300">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-yellow-400 blur-2xl opacity-20 animate-pulse"></div>
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto relative z-10" />
            </div>
            <h2 className="text-3xl font-black mb-1">ENLIGHTENED</h2>
            <p className="text-gray-500 mb-8 uppercase tracking-widest text-xs">Level {level} Mastered</p>
            <button 
              onClick={nextLevel}
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-green-600 hover:bg-green-500 rounded-2xl font-black text-lg transition-all active:scale-95 w-full shadow-lg shadow-green-900/40"
            >
              <span>{level === TOTAL_LEVELS ? 'RESTART' : 'NEXT ASCENSION'}</span>
            </button>
          </div>
        </div>
      )}

      {/* HUD - Minimalist */}
      {phase === GamePhase.PLAYING && (
        <div className="absolute top-0 inset-x-0 p-6 z-10 pointer-events-none flex justify-between items-start">
          <div className="bg-black/30 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5">
            <span className="text-[10px] text-orange-400 block tracking-widest uppercase">Depth</span>
            <span className="text-xl font-black tabular-nums">{level}</span>
          </div>
        </div>
      )}
    </div>
  );
}