import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useFBX, OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// ── Error Boundary — verhindert App-Crash bei kaputten FBX-Dateien ────────────
class CanvasErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
          <p className="text-sm font-medium text-slate-600">3D-Modell konnte nicht geladen werden</p>
          <p className="text-xs text-slate-400">
            Lade die Datei erneut von Mixamo herunter:<br />
            Format <strong>FBX · With Skin · 30fps</strong>, gleicher Charakter für alle Übungen.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Typ-Definitionen ──────────────────────────────────────────────────────────
type ExerciseKey = 'push-up' | 'jogging' | 'circle-crunch';

interface ExerciseConfig {
  file: string;
  label: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  tips: string[];
}

const EXERCISES: Record<ExerciseKey, ExerciseConfig> = {
  'push-up': {
    file: '/avatars/push-up.fbx',
    label: 'Liegestütze',
    cameraPos: [180, 80, 120],
    cameraTarget: [0, 60, 0],
    tips: ['Körper gerade wie ein Brett halten', 'Ellbogen nah am Körper führen', 'Bauch die ganze Zeit aktiv halten'],
  },
  'jogging': {
    file: '/avatars/jogging.fbx',
    label: 'Joggen',
    cameraPos: [150, 140, 180],
    cameraTarget: [0, 80, 0],
    tips: ['Aufrecht laufen, Blick nach vorne', 'Arme locker im 90°-Winkel schwingen', 'Weiche Landung mit dem Mittelfuß'],
  },
  'circle-crunch': {
    file: '/avatars/circle-crunch.fbx',
    label: 'Core-Übung',
    cameraPos: [180, 100, 130],
    cameraTarget: [0, 50, 0],
    tips: ['Lendenwirbel am Boden halten', 'Bewegung aus dem Bauch, nicht dem Schwung', 'Gleichmäßig atmen, nicht pressen'],
  },
};

// ── 3D-Modell mit Animation ───────────────────────────────────────────────────
function AvatarModel({ path }: { path: string }) {
  const fbx = useFBX(path);
  const mixer = useRef<THREE.AnimationMixer | null>(null);

  useEffect(() => {
    fbx.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    if (fbx.animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(fbx);
      const action = mixer.current.clipAction(fbx.animations[0]);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
    }

    return () => {
      mixer.current?.stopAllAction();
      mixer.current = null;
    };
  }, [fbx]);

  useFrame((_, dt) => {
    mixer.current?.update(dt);
  });

  return <primitive object={fbx} />;
}

// ── Lade-Platzhalter ──────────────────────────────────────────────────────────
function LoadingMesh() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt;
  });
  return (
    <mesh ref={ref} position={[0, 80, 0]}>
      <capsuleGeometry args={[20, 80, 6, 12]} />
      <meshStandardMaterial color="#93c5fd" wireframe />
    </mesh>
  );
}

// ── Beleuchtung + Boden ───────────────────────────────────────────────────────
function Environment() {
  return (
    <>
      <color attach="background" args={['#f8fafc']} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[200, 300, 150]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={1000}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
      />
      <directionalLight position={[-150, 200, -100]} intensity={0.5} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <ContactShadows
        position={[0, 1, 0]}
        opacity={0.35}
        scale={300}
        blur={2.5}
        far={50}
      />
    </>
  );
}

// ── 3D-Szene ──────────────────────────────────────────────────────────────────
function Scene({ config }: { config: ExerciseConfig }) {
  return (
    <>
      <Environment />
      <Suspense fallback={<LoadingMesh />}>
        <AvatarModel path={config.file} />
      </Suspense>
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={80}
        maxDistance={400}
        minPolarAngle={Math.PI / 10}
        maxPolarAngle={Math.PI / 2.1}
        target={new THREE.Vector3(...config.cameraTarget)}
      />
    </>
  );
}

// ── Öffentliche Komponente ────────────────────────────────────────────────────
interface Props {
  exerciseName: string;
}

function getExerciseKey(name: string): ExerciseKey | null {
  const n = name.toLowerCase();
  if (n.includes('liegestütz') || n.includes('push')) return 'push-up';
  if (n.includes('jogg') || n.includes('joggen') || n.includes('laufen')) return 'jogging';
  if (n.includes('plank') || n.includes('crunch') || n.includes('core')) return 'circle-crunch';
  return null;
}

export function ExerciseAvatar3D({ exerciseName }: Props) {
  const [open, setOpen] = useState(false);
  const key = getExerciseKey(exerciseName);
  if (!key) return null;

  const config = EXERCISES[key];

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
        {open ? 'Ausführung ausblenden' : 'Ausführung ansehen (3D)'}
      </button>

      {open && (
        <div className="mt-3 rounded-xl overflow-hidden border border-blue-100 bg-blue-50">
          {/* 3D Canvas */}
          <div style={{ height: 320 }}>
            <CanvasErrorBoundary>
              <Canvas
                shadows
                camera={{ position: config.cameraPos, fov: 45, near: 1, far: 2000 }}
                gl={{ antialias: true, preserveDrawingBuffer: false }}
              >
                <Scene config={config} />
              </Canvas>
            </CanvasErrorBoundary>
          </div>

          {/* Steuerung-Hinweis + Tips */}
          <div className="px-4 py-3">
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
              </svg>
              Drehen: klicken + ziehen · Zoom: Scrollrad
            </p>
            <ul className="space-y-1">
              {config.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-1.5 text-xs text-blue-700">
                  <span className="text-blue-400 mt-0.5">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
