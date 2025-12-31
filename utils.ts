import * as THREE from 'three';

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const generateLevelConfig = (level: number) => {
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

// Returns a set of connected pairs and whether the whole set is fully connected
export const getConnectivityData = (
  positions: { [id: string]: [number, number, number] },
  ids: string[],
  threshold: number
): { isFullyConnected: boolean, connections: [string, string][] } => {
  if (ids.length === 0) return { isFullyConnected: false, connections: [] };
  if (ids.length === 1) return { isFullyConnected: true, connections: [] };

  const connections: [string, string][] = [];
  const adj: { [key: string]: string[] } = {};
  ids.forEach(id => adj[id] = []);

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const idA = ids[i];
      const idB = ids[j];
      if (!positions[idA] || !positions[idB]) continue;
      
      const posA = new THREE.Vector3(...positions[idA]);
      const posB = new THREE.Vector3(...positions[idB]);
      
      if (posA.distanceTo(posB) < threshold) {
        adj[idA].push(idB);
        adj[idB].push(idA);
        connections.push([idA, idB]);
      }
    }
  }

  // BFS to check if all are connected
  const visited = new Set<string>();
  const queue = [ids[0]];
  visited.add(ids[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adj[current]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return {
    isFullyConnected: visited.size === ids.length,
    connections
  };
};