
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

    // Attempt to hide address bar on mobile
    try {
      // Accessing scrollTo via any cast to bypass Window type issues
      (window as any).scrollTo(0, 1);
    } catch (e) {}

    // Transition to playing
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
    <div className="relative w-full h-full bg-black text-white font-sans overflow-hidden flex flex-col items-center justify-center selection:bg-orange-500/30">
      
      {/* 3D Game Layer */}
      {phase !== GamePhase.MENU && (
        <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
          <GameWorld 
            level={level} 
            onLevelComplete={handleLevelComplete}
            isPaused={phase !== GamePhase.PLAYING}
          />
        </div>
      )}

      {/* UI Overlays */}
      {phase === GamePhase.MENU && (
        <div className="relative z-20 w-full h-full flex flex-col items-center justify-center bg-gray-950 p-6 md:p-12">
          <div className="max-w-xl w-full text-center space-y-8 flex flex-col items-center">
            <div className="space-y-2">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-orange-100 to-orange-600 drop-shadow-2xl">
                SIEVE
              </h1>
              <p className="text-2xl md:text-3xl font-light tracking-[0.4em] text-orange-400 uppercase">
                AND STONES
              </p>
            </div>
            
            <div className="w-full py-6 border-y border-white/5 relative group">
              <div className="absolute inset-0 bg-orange-500/5 blur-xl group-hover:bg-orange-500/10 transition-colors"></div>
              <p className="relative text-orange-100/70 italic text-base md:text-lg leading-relaxed px-4">
                "{mysticQuote}"
              </p>
            </div>

            <div className="space-y-6 pt-4 w-full">
              <p className="text-gray-500 text-[10px] md:text-xs uppercase tracking-[0.2em] leading-loose max-w-sm mx-auto">
                TILT YOUR CONSCIOUSNESS TO UNITE THE STONES. <br/>
                ONCE JOINED, PURGE THE CHAOS.
              </p>
              
              <button 
                onClick={startGame}
                disabled={loading}
                className="group relative flex items-center gap-4 px-12 py-6 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-800 rounded-full text-2xl font-black transition-all active:scale-95 shadow-[0_0_40px_rgba(234,88,12,0.3)] hover:shadow-[0_0_60px_rgba(234,88,12,0.5)] w-full md:w-auto justify-center overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                {loading ? (
                  <RotateCw className="animate-spin w-8 h-8" />
                ) : (
                  <>
                    <Play className="fill-current w-6 h-6" />
                    <span>BEGIN JOURNEY</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-12 flex flex-col items-center gap-4">
              <div className="flex gap-4 text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                <span className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-orange-500 rounded-full"></div> 
                  MOBILE: TILT
                </span>
                <span className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-orange-500 rounded-full"></div> 
                  PC: MOUSE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === GamePhase.LEVEL_COMPLETE && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30 p-4 backdrop-blur-lg">
          <div className="bg-gray-900 p-12 rounded-[2rem] border border-white/5 shadow-[0_0_100px_rgba(0,0,0,0.8)] text-center max-w-md w-full transform animate-in fade-in zoom-in duration-500">
            <div className="relative mb-8 group">
              <div className="absolute inset-0 bg-yellow-400 blur-[40px] opacity-20 group-hover:opacity-40 transition-opacity animate-pulse"></div>
              <Trophy className="w-24 h-24 text-yellow-500 mx-auto relative z-10 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]" />
            </div>
            <h2 className="text-4xl font-black mb-2 tracking-tight">HARMONY</h2>
            <p className="text-orange-400/80 mb-10 uppercase tracking-[0.3em] text-[10px] font-bold">Ascended to Level {level}</p>
            <button 
              onClick={nextLevel}
              className="group flex items-center justify-center gap-3 px-10 py-5 bg-green-600 hover:bg-green-500 rounded-2xl font-black text-xl transition-all active:scale-95 w-full shadow-2xl shadow-green-900/30"
            >
              <span>{level === TOTAL_LEVELS ? 'REBIRTH' : 'NEXT ASCENSION'}</span>
            </button>
          </div>
        </div>
      )}

      {/* HUD - Minimalist & Responsive */}
      {phase === GamePhase.PLAYING && (
        <div className="absolute top-0 inset-x-0 p-8 z-10 pointer-events-none flex justify-between items-start animate-in fade-in slide-in-from-top duration-700">
          <div className="bg-black/40 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/5 shadow-2xl">
            <span className="text-[10px] text-orange-500 block tracking-[0.3em] font-bold uppercase mb-1">Depth</span>
            <span className="text-3xl font-black tabular-nums tracking-tighter leading-none">{level}</span>
          </div>
        </div>
      )}
    </div>
  );
}
