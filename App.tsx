import React, { useState, useEffect } from 'react';
import { GamePhase } from './types';
import GameWorld from './components/GameWorld';
import { Play, RotateCw, Trophy, AlertTriangle } from 'lucide-react';

const TOTAL_LEVELS = 20;

export default function App() {
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.MENU);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Handle Level Completion
  const handleLevelComplete = () => {
    setPhase(GamePhase.LEVEL_COMPLETE);
  };

  const nextLevel = () => {
    if (level >= TOTAL_LEVELS) {
      // Loop or finish
      setLevel(1);
      setPhase(GamePhase.MENU);
    } else {
      setLevel(prev => prev + 1);
      setPhase(GamePhase.PLAYING);
    }
  };

  const startGame = async () => {
    // Request permission for iOS 13+ devices
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
          setPhase(GamePhase.PLAYING);
        } else {
          alert("Gyroscope permission is required for the full experience.");
          // Still allow playing (maybe mouse fallback)
          setPhase(GamePhase.PLAYING);
        }
      } catch (e) {
        console.error(e);
        // Start anyway for non-iOS or if error occurs
        setPhase(GamePhase.PLAYING);
      }
    } else {
      // Non-iOS device or permission not required explicitly
      setPermissionGranted(true);
      setPhase(GamePhase.PLAYING);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-900 text-white font-sans overflow-hidden">
      
      {/* 3D Game Layer */}
      {phase !== GamePhase.MENU && (
        <GameWorld 
          level={level} 
          onLevelComplete={handleLevelComplete}
          isPaused={phase !== GamePhase.PLAYING}
        />
      )}

      {/* UI Overlays */}
      {phase === GamePhase.MENU && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-6">
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-600">
            Sieve & Stones
          </h1>
          <p className="text-gray-300 mb-8 max-w-md text-center">
            Tilt your device to shake the sieve.
            <br/><br/>
            1. Gather stones together.<br/>
            2. Weld them.<br/>
            3. Clear beans from the ring.
          </p>
          <button 
            onClick={startGame}
            className="flex items-center gap-2 px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-full text-xl font-bold transition-transform active:scale-95"
          >
            <Play fill="currentColor" /> Start Game
          </button>
          <div className="mt-8 text-sm text-gray-500 flex items-center gap-2">
            <RotateCw size={16} /> Landscape mode recommended
          </div>
        </div>
      )}

      {phase === GamePhase.LEVEL_COMPLETE && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 animate-in fade-in duration-500">
          <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-2xl text-center">
            <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-2">Level {level} Complete!</h2>
            <p className="text-gray-400 mb-6">Excellent gathering skills.</p>
            <button 
              onClick={nextLevel}
              className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors w-full"
            >
              {level === TOTAL_LEVELS ? 'Restart Game' : 'Next Level'}
            </button>
          </div>
        </div>
      )}

      {/* HUD */}
      {phase === GamePhase.PLAYING && (
        <div className="absolute top-4 left-4 z-10 pointer-events-none">
          <div className="text-2xl font-bold drop-shadow-md">Level {level}</div>
          <div className="text-sm text-gray-400">
            {level <= 15 ? 'Type: Single Bean' : 'Type: Mixed Beans'}
          </div>
        </div>
      )}
    </div>
  );
}
