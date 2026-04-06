import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, PerspectiveCamera, Float } from '@react-three/drei';
import * as THREE from 'three';

// Modelo de arma placeholder (AK-47 de teste público ou similar)
// Se a URL falhar, o Suspense deve lidar com um fallback
const TEST_MODEL_URL = 'https://market-assets.fra1.cdn.digitaloceanspaces.com/market-assets/models/ak47/model.gltf';

function Weapon({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);

  // Lógica de rotação suave opcional (auto-rotation)
  useFrame((state) => {
    if (group.current) {
        group.current.rotation.y += 0.005;
    }
  });

  return (
    <primitive 
      ref={group}
      object={scene} 
      scale={1.5} 
      position={[0, -0.5, 0]} 
      rotation={[0, Math.PI / 2, 0]} 
    />
  );
}

function Scene() {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} />
      <OrbitControls 
         enablePan={false} 
         enableZoom={true} 
         minDistance={2} 
         maxDistance={6} 
         autoRotate={false}
      />
      
      {/* Luzes táticas */}
      <ambientLight intensity={0.5} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} color="#fbb724" castShadow />
      <pointLight position={[-10, -10, -10]} color="#ffffff" intensity={1} />
      
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
         <Suspense fallback={null}>
            <Weapon url={TEST_MODEL_URL} />
         </Suspense>
      </Float>

      <ContactShadows resolution={1024} scale={10} blur={2} opacity={0.4} far={1} color="#000000" />
      <Environment preset="city" />
    </>
  );
}

export default function WeaponViewer3D() {
  return (
    <div className="w-full h-full relative group">
       {/* Scanner Grid Layout Overlay */}
       <div className="absolute inset-0 pointer-events-none border border-primary/20 bg-[linear-gradient(rgba(251,191,36,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.05)_1px,transparent_1px)] bg-[size:40px_40px] z-0"></div>
       
       <Canvas shadows dpr={[1, 2]}>
          <Scene />
       </Canvas>

       {/* HUD Overlay técnico */}
       <div className="absolute bottom-4 left-4 flex flex-col gap-1 text-[8px] font-mono text-primary/40 uppercase tracking-[0.2em] pointer-events-none z-20">
          <span>Model: [TACTICAL_ENGINE_V1]</span>
          <span>Status: SYNCED_ACTIVE</span>
          <span>DPR: 2.0_MAX</span>
       </div>
    </div>
  );
}

// Pré-carregamento do modelo
useGLTF.preload(TEST_MODEL_URL);
