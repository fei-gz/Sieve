export enum GamePhase {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER'
}

export enum LevelPhase {
  GATHERING = 'GATHERING', // Stage 1: Connect stones
  WELDING = 'WELDING',     // Transition
  CLEARING = 'CLEARING'    // Stage 2: Clear beans from circle
}

export interface LevelConfig {
  levelNumber: number;
  stoneCount: number;
  beanCount: number;
  beanTypes: number; // 1 or 2
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface StoneData {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

// Data needed to reconstruct the welded cluster
export interface WeldedClusterData {
  center: [number, number, number];
  stones: {
    offset: [number, number, number]; // Offset from center
    rotation: [number, number, number];
    scale: number;
  }[];
  radius: number; // Radius of the bounding circle
}
