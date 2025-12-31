// @ts-nocheck
import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useCompoundBody, useSphere, useBox } from '@react-three/cannon';
import { Sky, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LevelConfig, LevelPhase, WeldedClusterData } from '../types';
import { generateLevelConfig, getConnectivityData, randomRange } from '../utils';

// --- Visual Components ---

const SieveVisual = () => {
  const R = 5;
  const WallHeight = 2.8;

  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow castShadow position={[0, -0.1, 0]}>
        <cylinderGeometry args={[R, R, 0.2, 64]} />
        <meshStandardMaterial color="#0a0a0a" roughness={1.0} metalness={0.0} />
      </mesh>
      {/* Wall */}
      <mesh position={[0, WallHeight / 2, 0]}>
        <cylinderGeometry args={[R, R, WallHeight, 64, 1, true]} />
        <meshStandardMaterial color="#1a1a1a" side={THREE.DoubleSide} metalness={0.2} roughness={0.8} />
      </mesh>
      {/* Rim */}
      <mesh position={[0, WallHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, 0.25, 16, 64]} />
        <meshStandardMaterial color="#333" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
};

// --- Physics Components ---

const SievePhysics = () => {
  const R = 5;
  const WallHeight = 2.8;

  const shapes = useMemo(() => {
    const s = [];
    // Static massive floor
    s.push({ type: 'Box', args: [R * 2.5, 10.0, R * 2.5], position: [0, -5.0, 0] });
    // Static walls
    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * R;
      const z = Math.sin(angle) * R;
      const boxLen = (2 * Math.PI * R) / segments + 1.2;
      s.push({
        type: 'Box',
        args: [2.5, WallHeight + 10.0, boxLen],
        position: [x, WallHeight / 2, z],
        rotation: [0, -angle, 0]
      });
    }
    return s;
  }, []);

  const [ref] = useCompoundBody(() => ({
    mass: 0,
    type: 'Static',
    position: [0, 0, 0],
    shapes: shapes,
    friction: 1.0,
    restitution: 0.0
  }));

  return <group ref={ref as any} />;
};

const Stone = ({ position, id, onUpdate, isConnected, isFullyConnected }: { 
  position: [number, number, number], id: string, onUpdate: (id: string, pos: [number, number, number]) => void,
  isConnected: boolean, isFullyConnected: boolean
}) => {
  const [ref, api] = useBox(() => ({
    mass: 12,
    position,
    args: [0.8, 0.6, 0.8], 
    linearDamping: 0.7, 
    angularDamping: 0.8,
    friction: 1.5, // High friction for realistic sliding threshold
    restitution: 0.05
  }));
  
  const scale = useMemo(() => [randomRange(0.9, 1.1), randomRange(0.9, 1.1), randomRange(0.9, 1.1)], []);

  useEffect(() => {
    const unsub = api.position.subscribe((v) => {
      // Escape recovery
      if (v[1] < -4) {
        api.position.set(randomRange(-1, 1), 6, randomRange(-1, 1));
        api.velocity.set(0, 0, 0);
      }
      onUpdate(id, v as [number, number, number]);
    });
    return unsub;
  }, [api, id, onUpdate]);

  const emissiveColor = isFullyConnected ? "#00ffff" : (isConnected ? "#0088ff" : "#000000");
  const emissiveIntensity = isFullyConnected ? 3.0 : (isConnected ? 1.5 : 0);

  return (
    <mesh ref={ref as any} castShadow receiveShadow scale={scale as [number, number, number]}>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial 
        color="#2c3e50" 
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
        roughness={1.0} 
        flatShading 
      />
    </mesh>
  );
};

const Bean = ({ position, color, onUpdate, id }: { position: [number, number, number], color: string, id: string, onUpdate: (id: string, pos: [number, number, number]) => void }) => {
  const [ref, api] = useSphere(() => ({
    mass: 0.3,
    position,
    args: [0.3],
    linearDamping: 0.5,
    angularDamping: 0.5,
    material: { friction: 0.5, restitution: 0.1 }
  }));

  useEffect(() => {
    const unsub = api.position.subscribe((v) => {
      if (v[1] < -6) {
         api.position.set(randomRange(-3, 3), 6, randomRange(-3, 3));
         api.velocity.set(0, 0, 0);
      }
      onUpdate(id, v as [number, number, number]);
    });
    return unsub;
  }, [api, id, onUpdate]);

  return (
    <mesh ref={ref as any} castShadow receiveShadow scale={[1, 1.4, 1]}> 
      <sphereGeometry args={[0.3, 12, 12]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
    </mesh>
  );
};

const ClusterTrackerWrapper = ({ data, onUpdate }: { data: WeldedClusterData, onUpdate: (p: [number, number, number]) => void }) => {
  const shapes = data.stones.map((s) => ({
    type: 'Box' as const,
    args: [0.8, 0.6, 0.8] as [number, number, number],
    position: s.offset,
    rotation: s.rotation,
  }));

  const [ref, api] = useCompoundBody(() => ({
    mass: 20 * data.stones.length,
    position: data.center,
    shapes: shapes,
    linearDamping: 0.8,
    angularDamping: 0.9,
    friction: 1.5
  }));

  useEffect(() => {
    const unsub = api.position.subscribe((v) => {
      if (v[1] < -4) {
        api.position.set(0, 6, 0);
        api.velocity.set(0, 0, 0);
      }
      onUpdate(v as [number, number, number]);
    });
    return unsub;
  }, [api, onUpdate]);

  return (
    <group ref={ref as any}>
      {data.stones.map((s, i) => (
        <mesh key={i} position={s.offset} rotation={new THREE.Euler(...s.rotation)} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#000" emissive="#00ffff" emissiveIntensity={2.0} roughness={1.0} flatShading />
        </mesh>
      ))}
    </group>
  );
}

const GameManager = ({ level, onLevelComplete }: { level: number, onLevelComplete: () => void }) => {
  const [config, setConfig] = useState<LevelConfig>(generateLevelConfig(level));
  const [phase, setPhase] = useState<LevelPhase>(LevelPhase.GATHERING);
  
  const stonePositions = useRef<{[id: string]: [number, number, number]}>({});
  const beanPositions = useRef<{[id: string]: [number, number, number]}>({});
  const [weldedData, setWeldedData] = useState<WeldedClusterData | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [isFullyConnected, setIsFullyConnected] = useState(false);
  
  const connectedTime = useRef(0);
  const clearedTime = useRef(0);
  const clusterPosRef = useRef<[number, number, number] | null>(null);

  useEffect(() => {
    setConfig(generateLevelConfig(level));
    setPhase(LevelPhase.GATHERING);
    setWeldedData(null);
    stonePositions.current = {};
    beanPositions.current = {};
    connectedTime.current = 0;
    clearedTime.current = 0;
    clusterPosRef.current = null;
    setIsFullyConnected(false);
    setConnectedIds(new Set());
  }, [level]);

  const handleWeld = () => {
    const ids = Object.keys(stonePositions.current);
    if (ids.length === 0) return;
    let cx = 0, cy = 0, cz = 0;
    ids.forEach(id => {
      const [x, y, z] = stonePositions.current[id];
      cx += x; cy += y; cz += z;
    });
    cx /= ids.length; cy /= ids.length; cz /= ids.length;
    const center: [number, number, number] = [cx, cy, cz];
    let maxDist = 0;
    const stones = ids.map(id => {
      const [x, y, z] = stonePositions.current[id];
      const dist = Math.sqrt((x-cx)**2 + (y-cy)**2 + (z-cz)**2);
      if (dist > maxDist) maxDist = dist;
      return { offset: [x - cx, y - cy, z - cz], rotation: [0, 0, 0], scale: 1 };
    });
    setWeldedData({ center, stones, radius: maxDist + 1.2 });
    setPhase(LevelPhase.CLEARING);
  };

  useFrame((state, delta) => {
    if (phase === LevelPhase.GATHERING) {
      const ids = Object.keys(stonePositions.current);
      if (ids.length === config.stoneCount) {
        const connectivity = getConnectivityData(stonePositions.current, ids, 1.4);
        const newConnectedSet = new Set<string>();
        connectivity.connections.forEach(([a, b]) => { newConnectedSet.add(a); newConnectedSet.add(b); });
        
        if (connectivity.isFullyConnected !== isFullyConnected || newConnectedSet.size !== connectedIds.size) {
           setConnectedIds(newConnectedSet);
           setIsFullyConnected(connectivity.isFullyConnected);
        }

        if (connectivity.isFullyConnected) {
          connectedTime.current += delta;
        } else {
          connectedTime.current = 0;
        }
        if (connectedTime.current > 1.2) handleWeld();
      }
    }

    if (phase === LevelPhase.CLEARING && weldedData && clusterPosRef.current) {
      const clusterPos = new THREE.Vector3(...clusterPosRef.current);
      const beanIds = Object.keys(beanPositions.current);
      let anyInside = false;

      for (const bid of beanIds) {
        const b = beanPositions.current[bid];
        if (!b) continue;
        const dx = b[0] - clusterPos.x;
        const dz = b[2] - clusterPos.z;
        if (b[1] > -2 && (dx*dx + dz*dz) < weldedData.radius * weldedData.radius) {
          anyInside = true;
          break;
        }
      }

      if (!anyInside && beanIds.length > 0) {
        clearedTime.current += delta;
      } else {
        clearedTime.current = 0;
      }

      if (clearedTime.current > 1.5) onLevelComplete();
    }
  });

  const stones = phase === LevelPhase.GATHERING ? Array.from({ length: config.stoneCount }).map((_, i) => (
    <Stone 
      key={`stone-${i}`} id={`stone-${i}`}
      position={[randomRange(-1.5, 1.5), 3 + i * 1.5, randomRange(-1.5, 1.5)]} 
      onUpdate={(id, pos) => (stonePositions.current[id] = pos)}
      isConnected={connectedIds.has(`stone-${i}`)}
      isFullyConnected={isFullyConnected}
    />
  )) : null;

  const beans = Array.from({ length: config.beanCount }).map((_, i) => {
    const isType2 = config.beanTypes === 2 && i % 2 === 0;
    const color = isType2 ? "#00e5ff" : "#ff3d00";
    return (
      <Bean 
        key={`bean-${i}`} id={`bean-${i}`}
        position={[randomRange(-3, 3), 6 + i * 0.45, randomRange(-3, 3)]}
        color={color}
        onUpdate={(id, pos) => (beanPositions.current[id] = pos)}
      />
    );
  });

  return (
    <>
      {stones}
      {phase === LevelPhase.CLEARING && weldedData && (
        <ClusterTrackerWrapper 
          data={weldedData} 
          onUpdate={(pos) => clusterPosRef.current = pos} 
        />
      )}
      {beans}
      <Html position={[0, 4, -4]} center transform pointerEvents="none">
        <div className="flex flex-col items-center gap-2 text-center pointer-events-none select-none">
          <div className={`px-10 py-4 backdrop-blur-3xl border border-white/20 rounded-full shadow-2xl transition-all duration-700 ${isFullyConnected ? 'bg-cyan-500/90 scale-105 shadow-cyan-500/50' : 'bg-black/90'}`}>
            <p className={`text-base font-black uppercase tracking-[0.5em] transition-colors ${isFullyConnected ? 'text-white' : 'text-orange-500'}`}>
               {phase === LevelPhase.GATHERING ? (isFullyConnected ? 'SYNERGY' : 'GATHERING') : 'PURGING'}
            </p>
          </div>
        </div>
      </Html>
    </>
  );
};

export default function GameWorld({ level, onLevelComplete, isPaused }: { level: number, onLevelComplete: () => void, isPaused: boolean }) {
  const [gravity, setGravity] = useState<[number, number, number]>([0, -40, 0]);
  const targetGravity = useRef<[number, number, number]>([0, -40, 0]);

  useEffect(() => {
    const baseG = -45;
    const sensitivity = 55; // Adjust sensitivity of tilt force

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (isPaused) return;
      const beta = e.beta || 0;  // -180 to 180 (X-axis tilt)
      const gamma = e.gamma || 0; // -90 to 90 (Z-axis tilt)
      
      // Convert degrees to force
      const tiltX = THREE.MathUtils.clamp(gamma / 90, -1, 1);
      const tiltZ = THREE.MathUtils.clamp(beta / 90, -1, 1);
      
      targetGravity.current = [tiltX * sensitivity, baseG, tiltZ * sensitivity];
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPaused) return;
      const tx = (e.clientX / window.innerWidth - 0.5) * 2;
      const tz = (e.clientY / window.innerHeight - 0.5) * 2;
      targetGravity.current = [tx * sensitivity, baseG, tz * sensitivity];
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPaused]);

  // Handle smooth gravity transitions to prevent physical glitches
  const GravityController = () => {
    useFrame((_, delta) => {
      if (isPaused) return;
      const lerpFactor = Math.min(delta * 12, 1);
      setGravity([
        THREE.MathUtils.lerp(gravity[0], targetGravity.current[0], lerpFactor),
        THREE.MathUtils.lerp(gravity[1], targetGravity.current[1], lerpFactor),
        THREE.MathUtils.lerp(gravity[2], targetGravity.current[2], lerpFactor)
      ]);
    });
    return null;
  };

  return (
    <div className="w-full h-full bg-[#050505]">
      <Canvas shadows camera={{ position: [0, 28, 0], fov: 45, near: 0.1, far: 200 }}>
        <Suspense fallback={null}>
          <Sky sunPosition={[10, 20, 10]} turbidity={0.01} rayleigh={0.1} />
          <ambientLight intensity={2.5} />
          <directionalLight position={[20, 40, 20]} intensity={5} castShadow shadow-mapSize={[2048, 2048]} />
          <pointLight position={[-15, 15, -15]} intensity={3} color="#00ffff" />

          <Physics 
            gravity={gravity} 
            iterations={80} 
            tolerance={0.0000001}
            allowSleep={false}
          >
            <GravityController />
            <SievePhysics />
            <SieveVisual />
            {!isPaused && <GameManager level={level} onLevelComplete={onLevelComplete} />}
          </Physics>

          {/* Endless floor visual */}
          <mesh position={[0, -50, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1000, 1000]} />
            <meshBasicMaterial color="#000" />
          </mesh>
        </Suspense>
      </Canvas>
    </div>
  );
}