import * as THREE from 'three';
import { StoneData } from './types';

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const generateLevelConfig = (level: number) => {
  // Level 1: 3 stones, 15 beans
  // Level 20: ~10 stones, ~80 beans
  const stoneCount = Math.min(3 + Math.floor((level - 1) / 3), 12); 
  const beanCount = Math.min(15 + (level - 1) * 4, 100);
  const beanTypes = level >= 16 ? 2 : 1;

  return {
    levelNumber: level,
    stoneCount,
    beanCount,
    beanTypes
  };
};

// Check if all stones are connected (Graph Search)
// Returns true if all stones form a single connected component
export const checkConnectivity = (
  positions: { [id: string]: [number, number, number] },
  ids: string[],
  threshold: number
): boolean => {
  if (ids.length <= 1) return true;

  const adj: { [key: string]: string[] } = {};
  ids.forEach(id => adj[id] = []);

  // Build Graph
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const idA = ids[i];
      const idB = ids[j];
      const posA = new THREE.Vector3(...positions[idA]);
      const posB = new THREE.Vector3(...positions[idB]);
      
      // Distance check (center to center)
      // Assuming stones have avg radius ~0.8, threshold should be around 1.8-2.0
      if (posA.distanceTo(posB) < threshold) {
        adj[idA].push(idB);
        adj[idB].push(idA);
      }
    }
  }

  // BFS / DFS
  const visited = new Set<string>();
  const stack = [ids[0]];
  visited.add(ids[0]);

  while (stack.length > 0) {
    const current = stack.pop()!;
    const neighbors = adj[current];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        stack.push(neighbor);
      }
    }
  }

  return visited.size === ids.length;
};
