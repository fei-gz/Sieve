import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, useCompoundBody, useSphere, useBox } from '@react-three/cannon';
import { Environment, Sky, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LevelConfig, LevelPhase, WeldedClusterData } from '../types';
import { generateLevelConfig, checkConnectivity, randomRange } from '../utils';

// Fix for missing JSX intrinsic elements types
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      directionalLight: any;
      group: any;
      mesh: any;
      boxGeometry: any;
      planeGeometry: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      dodecahedronGeometry: any;
      torusGeometry: any;
      ringGeometry: any;
      circleGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
    }
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      directionalLight: any;
      group: any;
      mesh: any;
      boxGeometry: any;
      planeGeometry: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      dodecahedronGeometry: any;
      torusGeometry: any;
      ringGeometry: any;
      circleGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
    }
  }
}

// --- Visual Helpers ---

const AuraRing = ({ radius }: { radius: number }) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 120);
      grad.addColorStop(0, 'rgba(255, 220, 100, 0.1)'); 
      grad.addColorStop(0.4, 'rgba(255, 180, 50, 0.6)');
      grad.addColorStop(0.8, 'rgba(255, 100, 0, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
      <planeGeometry args={[radius * 2.2, radius * 2.2]} />
      <meshBasicMaterial map={texture} transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
    </mesh>
  );
};

// --- Sub Components ---

// 1. The Sieve (Circular Tray)
const Sieve = ({ rotation }: { rotation: [number, number, number] }) => {
  const R = 5; // Radius
  const WallHeight = 1.5;
  const WallThickness = 0.5;

  // Generate physics shapes
  const shapes: any[] = useMemo(() => {
    const s = [];
    
    // Floor
    s.push({
      type: 'Cylinder',
      args: [R, R, 0.5, 32],
      position: [0, -0.25, 0],
      rotation: [-Math.PI / 2, 0, 0] 
    });

    // Wall Segments
    const segments = 24;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * R;
      const z = Math.sin(angle) * R;
      const boxLen = (2 * Math.PI * R) / segments + 0.5; // Slightly overlap
      s.push({
        type: 'Box',
        args: [0.5, WallHeight, boxLen], // Thickness, Height, Length
        position: [x, WallHeight / 2, z],
        rotation: [0, -angle, 0] // Tangent rotation
      });
    }
    return s;
  }, []);

  const [ref, api] = useCompoundBody(() => ({
    mass: 0,
    type: 'Kinematic',
    position: [0, 0, 0],
    shapes: shapes,
  }));

  useFrame(() => {
    api.rotation.set(...rotation);
  });

  return (
    <group ref={ref as any}>
      <mesh receiveShadow castShadow position={[0, -0.25, 0]}>
        <cylinderGeometry args={[R, R, 0.5, 64]} />
        <meshStandardMaterial color="#5d4037" roughness={0.6} />
      </mesh>
      
      <mesh position={[0, WallHeight/2, 0]}>
         <cylinderGeometry args={[R, R, WallHeight, 64, 1, true]} />
         <meshStandardMaterial color="#6d4c41" side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, WallHeight, 0]} rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[R, 0.2, 16, 64]} />
        <meshStandardMaterial color="#8d6e63" roughness={0.5} />
      </mesh>
    </group>
  );
};

// 2. Stone Component
const Stone = ({ position, id, onUpdate }: { position: [number, number, number], id: string, onUpdate: (id: string, pos: [number, number, number]) => void }) => {
  const [ref, api] = useBox(() => ({
    mass: 5,
    position,
    args: [0.8, 0.6, 0.8], 
    linearDamping: 0.5,
    angularDamping: 0.5,
  }));
  
  const scale = useMemo(() => [randomRange(0.8, 1.2), randomRange(0.8, 1.2), randomRange(0.8, 1.2)], []);

  useEffect(() => {
    const unsub = api.position.subscribe((v) => {
      onUpdate(id, v as [number, number, number]);
    });
    return unsub;
  }, [api, id, onUpdate]);

  return (
    <mesh ref={ref as any} castShadow receiveShadow scale={scale as [number, number, number]}>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#78909c" roughness={0.9} flatShading />
    </mesh>
  );
};

// 3. Bean Component
const Bean = ({ position, color, onUpdate, id }: { position: [number, number, number], color: string, id: string, onUpdate: (id: string, pos: [number, number, number]) => void }) => {
  const [ref, api] = useSphere(() => ({
    mass: 0.8,
    position,
    args: [0.3], // Radius
    linearDamping: 0.2,
    angularDamping: 0.2,
    material: { friction: 0.05, restitution: 0.4 }
  }));

  useEffect(() => {
    const unsub = api.position.subscribe((v) => onUpdate(id, v as [number, number, number]));
    return unsub;
  }, [api, id, onUpdate]);

  return (
    <mesh ref={ref as any} castShadow receiveShadow scale={[1, 1.5, 1]}> 
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
    </mesh>
  );
};

// 4. Wrapper to hook into the compound body position for the game manager
const ClusterTrackerWrapper = ({ data, onUpdate }: { data: WeldedClusterData, onUpdate: (p: [number, number, number]) => void }) => {
  const shapes = data.stones.map((s) => ({
    type: 'Box' as const,
    args: [0.8, 0.6, 0.8] as [number, number, number],
    position: s.offset,
    rotation: s.rotation,
  }));

  const [ref, api] = useCompoundBody(() => ({
    mass: 5 * data.stones.length,
    position: data.center,
    shapes: shapes,
    linearDamping: 0.2,
    angularDamping: 0.2,
  }));

  useEffect(() => {
    const unsub = api.position.subscribe((v) => onUpdate(v as [number, number, number]));
    return unsub;
  }, [api, onUpdate]);

  return (
    <group ref={ref as any}>
      {data.stones.map((s, i) => (
        <mesh key={i} position={s.offset} rotation={new THREE.Euler(...s.rotation)} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#546e7a" emissive="#37474f" roughness={0.9} flatShading />
        </mesh>
      ))}
      {/* Protagonist Aura Visual */}
      <AuraRing radius={data.radius} />
    </group>
  );
}

// --- Main Logic Manager ---

const GameManager = ({ level, onLevelComplete }: { level: number, onLevelComplete: () => void }) => {
  const [config, setConfig] = useState<LevelConfig>(generateLevelConfig(level));
  const [phase, setPhase] = useState<LevelPhase>(LevelPhase.GATHERING);
  
  // Physics State Tracking
  const stonePositions = useRef<{[id: string]: [number, number, number]}>({});
  const beanPositions = useRef<{[id: string]: [number, number, number]}>({});

  // Welded State
  const [weldedData, setWeldedData] = useState<WeldedClusterData | null>(null);

  // Connectivity Timer
  const connectedTime = useRef(0);
  const clearedTime = useRef(0);

  // Since useCompoundBody is inside WeldedCluster, we need a way to get its live position.
  const clusterPosRef = useRef<[number, number, number] | null>(null);

  // Initialization
  useEffect(() => {
    setConfig(generateLevelConfig(level));
    setPhase(LevelPhase.GATHERING);
    setWeldedData(null);
    stonePositions.current = {};
    beanPositions.current = {};
    connectedTime.current = 0;
    clearedTime.current = 0;
    clusterPosRef.current = null;
  }, [level]);

  const handleWeld = () => {
    const ids = Object.keys(stonePositions.current);
    if (ids.length === 0) return;

    // Calculate Center of Mass
    let cx = 0, cy = 0, cz = 0;
    ids.forEach(id => {
      const [x, y, z] = stonePositions.current[id];
      cx += x; cy += y; cz += z;
    });
    cx /= ids.length;
    cy /= ids.length;
    cz /= ids.length;

    const center: [number, number, number] = [cx, cy, cz];

    // Calculate relative offsets and max radius
    let maxDist = 0;
    const stones = ids.map(id => {
      const [x, y, z] = stonePositions.current[id];
      const dist = Math.sqrt((x-cx)**2 + (y-cy)**2 + (z-cz)**2);
      if (dist > maxDist) maxDist = dist;
      return {
        offset: [x - cx, y - cy, z - cz] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: 1
      };
    });

    const clusterRadius = maxDist + 1.2; 
    setWeldedData({ center, stones, radius: clusterRadius });
    setPhase(LevelPhase.CLEARING);
  };

  // Game Loop Logic
  useFrame((state, delta) => {
    // --- GATHERING PHASE ---
    if (phase === LevelPhase.GATHERING) {
      const ids = Object.keys(stonePositions.current);
      if (ids.length === config.stoneCount) {
        // Threshold: 1.8 units 
        const isConnected = checkConnectivity(stonePositions.current, ids, 1.8);
        
        if (isConnected) {
          connectedTime.current += delta;
        } else {
          connectedTime.current = 0;
        }

        // If connected for 1.5 seconds, weld!
        if (connectedTime.current > 1.5) {
          handleWeld();
        }
      }
    }

    // --- CLEARING PHASE ---
    if (phase === LevelPhase.CLEARING && weldedData && clusterPosRef.current) {
      const clusterPos = new THREE.Vector3(...clusterPosRef.current);
      
      const beanIds = Object.keys(beanPositions.current);
      let allOutside = true;

      for (const bid of beanIds) {
        const b = beanPositions.current[bid];
        const dx = b[0] - clusterPos.x;
        const dz = b[2] - clusterPos.z;
        const distSq = dx*dx + dz*dz;
        
        // Use squared distance check
        if (distSq < weldedData.radius * weldedData.radius) {
          allOutside = false;
          break;
        }
      }

      if (allOutside && beanIds.length > 0) {
        clearedTime.current += delta;
      } else {
        clearedTime.current = 0;
      }

      if (clearedTime.current > 2.0) {
        onLevelComplete();
      }
    }
  });

  // Generate Stones
  const stones = [];
  if (phase === LevelPhase.GATHERING) {
    for (let i = 0; i < config.stoneCount; i++) {
      stones.push(
        <Stone 
          key={`stone-${i}`} 
          id={`stone-${i}`}
          position={[randomRange(-1.5, 1.5), 2 + i * 1.5, randomRange(-1.5, 1.5)]} 
          onUpdate={(id, pos) => (stonePositions.current[id] = pos)}
        />
      );
    }
  }

  // Generate Beans
  const beans = [];
  for (let i = 0; i < config.beanCount; i++) {
    const isType2 = config.beanTypes === 2 && i % 2 === 0;
    const color = isType2 ? "#4fc3f7" : "#ef5350"; // Lighter Blue or Red
    beans.push(
      <Bean 
        key={`bean-${i}`} 
        id={`bean-${i}`}
        position={[randomRange(-2, 2), 5 + i * 0.5, randomRange(-2, 2)]}
        color={color}
        onUpdate={(id, pos) => (beanPositions.current[id] = pos)}
      />
    );
  }

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
      
      {/* UI Helper Text in 3D Space */}
      <Html position={[0, 4, -5]} center transform pointerEvents="none" zIndexRange={[100, 0]}>
        <div style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: phase === LevelPhase.GATHERING ? '#fb8c00' : '#43a047',
          textShadow: '2px 2px 0px #000, 0 0 10px rgba(0,0,0,0.5)',
          whiteSpace: 'nowrap',
          fontFamily: 'sans-serif'
        }}>
           {phase === LevelPhase.GATHERING ? 'Tilt to Gather Stones!' : 'Clear Beans from the Aura!'}
        </div>
      </Html>
    </>
  );
};

// --- Main World Component ---

export default function GameWorld({ level, onLevelComplete, isPaused }: { level: number, onLevelComplete: () => void, isPaused: boolean }) {
  const [sieveRotation, setSieveRotation] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (isPaused) return;
      const beta = event.beta || 0; 
      const gamma = event.gamma || 0; 

      const maxTilt = 35;
      const rotX = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(beta, -maxTilt, maxTilt));
      const rotZ = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(-gamma, -maxTilt, maxTilt)); 

      setSieveRotation([rotX, 0, rotZ]);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isPaused) return;
      const x = (event.clientY / window.innerHeight) * 2 - 1; 
      const y = (event.clientX / window.innerWidth) * 2 - 1;
      const maxRot = 0.4;
      setSieveRotation([x * maxRot, 0, y * maxRot]);
    };

    if (window.DeviceOrientationEvent) {
       window.addEventListener('deviceorientation', handleOrientation);
    }
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPaused]);

  return (
    <Canvas shadows camera={{ position: [0, 14, 0], fov: 40, near: 0.1, far: 100 }}>
      <Suspense fallback={null}>
        <Sky sunPosition={[10, 20, 10]} rayleigh={0.5} turbidity={10} exposure={0.5} />
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[10, 25, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.4} color="#ffd54f" />

        <Physics gravity={[0, -15, 0]} allowSleep={false} iterations={20}>
          <Sieve rotation={sieveRotation} />
          {!isPaused && (
             <GameManager level={level} onLevelComplete={onLevelComplete} />
          )}
        </Physics>

        <mesh position={[0, -10, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial color="#000" />
        </mesh>
      </Suspense>
    </Canvas>
  );
}