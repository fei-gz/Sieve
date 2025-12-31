// @ts-nocheck
import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, useCompoundBody, useSphere, useBox, usePlane } from '@react-three/cannon';
import { Sky, Html } from '@react-three/drei';
import * as THREE from 'three';
import { LevelConfig, LevelPhase, WeldedClusterData } from '../types';
import { generateLevelConfig, checkConnectivity, randomRange } from '../utils';

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

const Sieve = ({ rotation }: { rotation: [number, number, number] }) => {
  const R = 5; 
  const WallHeight = 1.5;

  const shapes: any[] = useMemo(() => {
    const s = [];
    // Thick floor to prevent tunneling
    s.push({
      type: 'Cylinder',
      args: [R, R, 2.0, 32],
      position: [0, -1.0, 0], 
    });

    const segments = 24;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * R;
      const z = Math.sin(angle) * R;
      const boxLen = (2 * Math.PI * R) / segments + 0.5;
      s.push({
        type: 'Box',
        args: [0.6, WallHeight + 1.0, boxLen],
        position: [x, (WallHeight / 2), z],
        rotation: [0, -angle, 0]
      });
    }
    return s;
  }, []);

  const [ref, api] = useCompoundBody(() => ({
    mass: 0,
    type: 'Kinematic',
    position: [0, 0, 0],
    shapes: shapes,
    friction: 0.3,
    restitution: 0.1
  }));

  useFrame(() => {
    api.rotation.set(...rotation);
  });

  return (
    <group ref={ref as any}>
      {/* Visual Floor */}
      <mesh receiveShadow castShadow position={[0, -0.25, 0]}>
        <cylinderGeometry args={[R, R, 0.5, 64]} />
        <meshStandardMaterial color="#3e2723" roughness={0.7} />
      </mesh>
      {/* Visual Walls */}
      <mesh position={[0, WallHeight/2, 0]}>
         <cylinderGeometry args={[R, R, WallHeight, 64, 1, true]} />
         <meshStandardMaterial color="#4e342e" side={THREE.DoubleSide} />
      </mesh>
      {/* Visual Rim */}
      <mesh position={[0, WallHeight, 0]} rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[R, 0.2, 16, 64]} />
        <meshStandardMaterial color="#5d4037" roughness={0.5} />
      </mesh>
    </group>
  );
};

const Stone = ({ position, id, onUpdate }: { position: [number, number, number], id: string, onUpdate: (id: string, pos: [number, number, number]) => void }) => {
  const [ref, api] = useBox(() => ({
    mass: 5,
    position,
    args: [0.8, 0.6, 0.8], 
    linearDamping: 0.6,
    angularDamping: 0.6,
    friction: 0.4
  }));
  
  const scale = useMemo(() => [randomRange(0.8, 1.2), randomRange(0.8, 1.2), randomRange(0.8, 1.2)], []);

  useEffect(() => {
    const unsub = api.position.subscribe((v) => onUpdate(id, v as [number, number, number]));
    return unsub;
  }, [api, id, onUpdate]);

  return (
    <mesh ref={ref as any} castShadow receiveShadow scale={scale as [number, number, number]}>
      <dodecahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color="#78909c" roughness={1} flatShading />
    </mesh>
  );
};

const Bean = ({ position, color, onUpdate, id }: { position: [number, number, number], color: string, id: string, onUpdate: (id: string, pos: [number, number, number]) => void }) => {
  const [ref, api] = useSphere(() => ({
    mass: 0.5,
    position,
    args: [0.3],
    linearDamping: 0.5,
    angularDamping: 0.5,
    material: { friction: 0.1, restitution: 0.2 }
  }));

  useEffect(() => {
    const unsub = api.position.subscribe((v) => onUpdate(id, v as [number, number, number]));
    return unsub;
  }, [api, id, onUpdate]);

  return (
    <mesh ref={ref as any} castShadow receiveShadow scale={[1, 1.4, 1]}> 
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} />
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
    mass: 5 * data.stones.length,
    position: data.center,
    shapes: shapes,
    linearDamping: 0.6,
    angularDamping: 0.6,
    friction: 0.4
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
          <meshStandardMaterial color="#455a64" emissive="#1a237e" emissiveIntensity={0.2} roughness={1} flatShading />
        </mesh>
      ))}
      <AuraRing radius={data.radius} />
    </group>
  );
}

const GameManager = ({ level, onLevelComplete }: { level: number, onLevelComplete: () => void }) => {
  const [config, setConfig] = useState<LevelConfig>(generateLevelConfig(level));
  const [phase, setPhase] = useState<LevelPhase>(LevelPhase.GATHERING);
  
  const stonePositions = useRef<{[id: string]: [number, number, number]}>({});
  const beanPositions = useRef<{[id: string]: [number, number, number]}>({});
  const [weldedData, setWeldedData] = useState<WeldedClusterData | null>(null);
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
      return {
        offset: [x - cx, y - cy, z - cz] as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        scale: 1
      };
    });

    setWeldedData({ center, stones, radius: maxDist + 1.2 });
    setPhase(LevelPhase.CLEARING);
  };

  useFrame((state, delta) => {
    if (phase === LevelPhase.GATHERING) {
      const ids = Object.keys(stonePositions.current);
      if (ids.length === config.stoneCount) {
        if (checkConnectivity(stonePositions.current, ids, 1.85)) {
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
      let allOutside = true;

      for (const bid of beanIds) {
        const b = beanPositions.current[bid];
        const dx = b[0] - clusterPos.x;
        const dz = b[2] - clusterPos.z;
        if ((dx*dx + dz*dz) < weldedData.radius * weldedData.radius) {
          allOutside = false;
          break;
        }
      }

      if (allOutside && beanIds.length > 0) {
        clearedTime.current += delta;
      } else {
        clearedTime.current = 0;
      }

      if (clearedTime.current > 1.8) onLevelComplete();
    }
  });

  const stones = phase === LevelPhase.GATHERING ? Array.from({ length: config.stoneCount }).map((_, i) => (
    <Stone 
      key={`stone-${i}`} id={`stone-${i}`}
      position={[randomRange(-1.5, 1.5), 2 + i * 1.5, randomRange(-1.5, 1.5)]} 
      onUpdate={(id, pos) => (stonePositions.current[id] = pos)}
    />
  )) : null;

  const beans = Array.from({ length: config.beanCount }).map((_, i) => {
    const isType2 = config.beanTypes === 2 && i % 2 === 0;
    const color = isType2 ? "#03a9f4" : "#f44336";
    return (
      <Bean 
        key={`bean-${i}`} id={`bean-${i}`}
        position={[randomRange(-2, 2), 5 + i * 0.4, randomRange(-2, 2)]}
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
        <div style={{
          fontSize: '1.2rem', fontWeight: 'bold', color: phase === LevelPhase.GATHERING ? '#ff9800' : '#4caf50',
          textShadow: '0 0 10px rgba(0,0,0,0.8)', whiteSpace: 'nowrap', fontFamily: 'sans-serif', textAlign: 'center'
        }}>
           {phase === LevelPhase.GATHERING ? 'SHAKE TO GATHER STONES' : 'SHAKE TO CLEAR BEANS'}
        </div>
      </Html>
    </>
  );
};

const SafetyCatch = () => {
  const [ref] = usePlane(() => ({
    position: [0, -8, 0],
    rotation: [-Math.PI / 2, 0, 0],
  }));
  return (
    <mesh ref={ref as any} visible={false}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial color="red" transparent opacity={0.1} />
    </mesh>
  );
};

export default function GameWorld({ level, onLevelComplete, isPaused }: { level: number, onLevelComplete: () => void, isPaused: boolean }) {
  const [sieveRotation, setSieveRotation] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (isPaused) return;
      const beta = e.beta || 0; 
      const gamma = e.gamma || 0; 
      const tiltSensitivity = 1.2; 
      const maxTilt = 0.8; 

      const rotX = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(beta) * tiltSensitivity, -maxTilt, maxTilt);
      const rotZ = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(-gamma) * tiltSensitivity, -maxTilt, maxTilt);
      setSieveRotation([rotX, 0, rotZ]);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPaused) return;
      const rx = (e.clientY / window.innerHeight - 0.5) * 1.0; 
      const rz = (e.clientX / window.innerWidth - 0.5) * -1.0;
      setSieveRotation([rx, 0, rz]);
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isPaused]);

  return (
    <div className="w-full h-full">
      <Canvas shadows camera={{ position: [0, 20, 4], fov: 40, near: 0.1, far: 100 }}>
        <Suspense fallback={null}>
          <Sky sunPosition={[100, 20, 100]} />
          <ambientLight intensity={1.0} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
          <pointLight position={[-10, 10, -10]} intensity={0.5} />

          <Physics gravity={[0, -30, 0]} iterations={30} tolerance={0.001}>
            <Sieve rotation={sieveRotation} />
            <SafetyCatch />
            {!isPaused && <GameManager level={level} onLevelComplete={onLevelComplete} />}
          </Physics>

          <mesh position={[0, -12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[200, 200]} />
            <meshBasicMaterial color="#050505" />
          </mesh>
        </Suspense>
      </Canvas>
    </div>
  );
}