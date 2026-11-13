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
          <p className="text-sm font-medium text-neutral-700">3D-Modell konnte nicht geladen werden</p>
          <p className="text-xs text-neutral-500">
            Lade die Datei erneut von Mixamo herunter:<br />
            Format <strong>FBX · With Skin · 30fps</strong>, pro Übung ein gerigter Charakter je Körpertyp-Variante.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Typ-Definitionen ──────────────────────────────────────────────────────────
// Blender-Animationen (Nov. 2026) aus dem Kai-Prototyp (lyra-app, blender/uebungen_animieren.py)
// – Schlüssel = FBX-Dateiname in public/avatars/.
type BlenderExerciseKey =
  'bridge'
  | 'bird-dog'
  | 'cat-cow'
  | 'mckenzie'
  | 'knee-to-chest'
  | 'supine-rotation'
  | 'hip-flexor-stretch'
  | 'wall-sit'
  | 'mini-squat'
  | 'straight-leg-raise'
  | 'lateral-raise'
  | 'clamshell'
  | 'side-lying-leg-raise'
  | 'standing-hip-extension'
  | 'piriformis-stretch'
  | 'neck-stretch'
  | 'calf-raise'
  | 'plank'
  | 'side-plank'
  | 'dead-bug'
  | 'pelvic-tilt'
  | 'superman'
  | 'curl-up'
  | 'single-leg-bridge'
  | 'sphinx'
  | 'childs-pose'
  | 'quadruped-neutral'
  | 'prone-ytw'
  | 'side-lying-external-rotation'
  | 'wall-angels'
  | 'heel-slides'
  | 'lateral-lunge'
  | 'lunge'
  | 'supine-chin-tuck'
  | 'butterfly-stretch'
  | 'quadruped-rock'
  | 'sumo-squat';
type ExerciseKey = 'push-up' | 'jogging' | 'circle-crunch' | 'squat' | BlenderExerciseKey;

// Körpertyp-/Haltungsvariante desselben Bewegungsablaufs — z. B. dieselbe
// Kniebeuge, aber mit anderem Körperbau oder einer anderen Haltung
// demonstriert. Erzeugung via Blender+MPFB2 (Regler für Gewicht/Muskulatur
// bzw. Pose) → Export FBX → Mixamo-Auto-Rigger → bestehende Animation
// darauf anwenden → Export (siehe docs/TASK_AVATAR_BODY_TYPES.md). Jede
// Übung hat eine eigene Mindest-Variante (siehe `defaultVariant` pro
// Übung) als Fallback; weitere sind optional.
export type BodyType = 'standard' | 'senior' | 'plus-size' | 'schlank' | 'mittel' | 'kraeftig' | 'hohlkreuz';

const BODY_TYPE_LABELS: Record<BodyType, string> = {
  standard: 'Standard',
  senior: 'Ältere Person',
  'plus-size': 'Größerer Körperbau',
  schlank: 'Schlank',
  mittel: 'Mittel',
  kraeftig: 'Kräftig',
  hohlkreuz: 'Hohlkreuz',
};

const BODY_TYPE_ORDER: BodyType[] = ['standard', 'senior', 'plus-size', 'schlank', 'mittel', 'kraeftig', 'hohlkreuz'];

interface ExerciseConfig {
  label: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  tips: string[];
  // Pfad pro verfügbarer Körpertyp-/Haltungsvariante. Fehlt eine Variante,
  // wird `defaultVariant` als Fallback verwendet (siehe resolveAvatarPath).
  variants: Partial<Record<BodyType, string>>;
  defaultVariant: BodyType;
}

const EXERCISES: Record<ExerciseKey, ExerciseConfig> = {
  'push-up': {
    label: 'Liegestütze',
    cameraPos: [180, 80, 120],
    cameraTarget: [0, 60, 0],
    tips: ['Körper gerade wie ein Brett halten', 'Ellbogen nah am Körper führen', 'Bauch die ganze Zeit aktiv halten'],
    variants: { standard: '/avatars/push-up.fbx' },
    defaultVariant: 'standard',
  },
  'jogging': {
    label: 'Joggen',
    cameraPos: [150, 140, 180],
    cameraTarget: [0, 80, 0],
    tips: ['Aufrecht laufen, Blick nach vorne', 'Arme locker im 90°-Winkel schwingen', 'Weiche Landung mit dem Mittelfuß'],
    variants: { standard: '/avatars/jogging.fbx' },
    defaultVariant: 'standard',
  },
  'circle-crunch': {
    label: 'Core-Übung',
    cameraPos: [180, 100, 130],
    cameraTarget: [0, 50, 0],
    tips: ['Lendenwirbel am Boden halten', 'Bewegung aus dem Bauch, nicht dem Schwung', 'Gleichmäßig atmen, nicht pressen'],
    variants: { standard: '/avatars/circle-crunch.fbx' },
    defaultVariant: 'standard',
  },
  'squat': {
    label: 'Kniebeuge',
    cameraPos: [216, 121, 156],
    cameraTarget: [0, 85, 0],
    tips: ['Knie in Richtung Fußspitzen halten', 'Rücken gerade, Blick nach vorne', 'Gewicht gleichmäßig auf beide Beine verteilen'],
    // Bis die Körperbau-/Haltungsvarianten existieren (Prototyp, siehe
    // docs/TASK_AVATAR_BODY_TYPES.md – Blender+MPFB2+Mixamo), zeigt die
    // Kniebeuge die Mixamo-Standardanimation. Eine zugewiesene Variante
    // (preferredVariant) fällt über resolveAvatarPath auf „standard“ zurück.
    // Varianten wieder eintragen, sobald die Dateien in public/avatars/ liegen:
    //   schlank: '/avatars/kniebeuge-schlank.fbx', mittel: '/avatars/kniebeuge-mittel.fbx',
    //   kraeftig: '/avatars/kniebeuge-kraeftig.fbx', hohlkreuz: '/avatars/kniebeuge-hohlkreuz.fbx',
    variants: { standard: '/avatars/squat.fbx' },
    defaultVariant: 'standard',
  },
  // ── Blender-Animationen (Kai-Prototyp lyra-app, Nov. 2026) ──
  // Kameras aus dem Prototyp; bei Übungen im Stand höher und 20 % weiter weg,
  // weil die Box hier flacher ist (sonst ist der Kopf abgeschnitten).
  'bridge': {
    label: 'Brücke',
    cameraPos: [155, 105, 55],
    cameraTarget: [0, 25, -10],
    tips: ['Füße hüftbreit aufstellen', 'Becken anheben, bis Schulter-Hüfte-Knie eine Linie bilden', 'Langsam Wirbel für Wirbel ablegen'],
    variants: { standard: '/avatars/bridge.fbx' },
    defaultVariant: 'standard',
  },
  'bird-dog': {
    label: 'Bird-Dog',
    cameraPos: [175, 110, 100],
    cameraTarget: [0, 40, -10],
    tips: ['Arm und gegenüberliegendes Bein gleichzeitig strecken', 'Rücken bleibt gerade, Becken kippt nicht', 'Bauch fest, ruhig atmen'],
    variants: { standard: '/avatars/bird-dog.fbx' },
    defaultVariant: 'standard',
  },
  'cat-cow': {
    label: 'Katze-Kuh',
    cameraPos: [150, 80, 110],
    cameraTarget: [0, 40, -5],
    tips: ['Bewegung beginnt im Becken', 'Katze: Rücken rund, Kopf sinkt', 'Kuh: Brust nach vorn, Blick leicht nach oben'],
    variants: { standard: '/avatars/cat-cow.fbx' },
    defaultVariant: 'standard',
  },
  'mckenzie': {
    label: 'McKenzie-Extension',
    cameraPos: [170, 90, 90],
    cameraTarget: [0, 20, -25],
    tips: ['Becken bleibt am Boden', 'Mit den Armen hochdrücken, so weit es angenehm geht', 'Oben ausatmen und den Rücken locker durchhängen lassen'],
    variants: { standard: '/avatars/mckenzie.fbx' },
    defaultVariant: 'standard',
  },
  'knee-to-chest': {
    label: 'Knie zur Brust',
    cameraPos: [160, 110, 100],
    cameraTarget: [0, 25, -10],
    tips: ['Mit beiden Händen knapp unter dem Knie greifen', 'Knie sanft zur Brust ziehen, Kopf bleibt liegen', 'Halten und ruhig weiteratmen'],
    variants: { standard: '/avatars/knee-to-chest.fbx' },
    defaultVariant: 'standard',
  },
  'supine-rotation': {
    label: 'Rumpfrotation im Liegen',
    cameraPos: [60, 150, 190],
    cameraTarget: [0, 15, -10],
    tips: ['Knie bleiben zusammen', 'Schultern bleiben am Boden', 'Langsam zur Seite sinken lassen, Kopf schaut zur Gegenseite'],
    variants: { standard: '/avatars/supine-rotation.fbx' },
    defaultVariant: 'standard',
  },
  'hip-flexor-stretch': {
    label: 'Hüftbeuger-Dehnung',
    cameraPos: [230, 120, 200],
    cameraTarget: [0, 72, 0],
    tips: ['Becken aufrichten, Bauch fest', 'Hüfte langsam nach vorn schieben', 'Arm der hinteren Seite nach oben strecken'],
    variants: { standard: '/avatars/hip-flexor-stretch.fbx' },
    defaultVariant: 'standard',
  },
  'wall-sit': {
    label: 'Wandsitz',
    cameraPos: [192, 127, 156],
    cameraTarget: [0, 85, 0],
    tips: ['Rücken flächig an der Wand', 'Oberschenkel parallel zum Boden', 'Knie über den Knöcheln'],
    variants: { standard: '/avatars/wall-sit.fbx' },
    defaultVariant: 'standard',
  },
  'mini-squat': {
    label: 'Mini-Squat',
    cameraPos: [204, 115, 228],
    cameraTarget: [0, 85, 0],
    tips: ['Füße hüftbreit, Gewicht auf beiden Füßen', 'Knie nur ca. 30° beugen, über der zweiten Zehe', 'Rücken gerade, langsam aufrichten'],
    variants: { standard: '/avatars/mini-squat.fbx' },
    defaultVariant: 'standard',
  },
  'straight-leg-raise': {
    label: 'Gestrecktes Beinanheben',
    cameraPos: [180, 90, 140],
    cameraTarget: [0, 25, 15],
    tips: ['Oberschenkel anspannen, Fuß anziehen', 'Gestrecktes Bein bis zur Höhe des anderen Oberschenkels heben', 'Langsam ablegen, Becken bleibt ruhig'],
    variants: { standard: '/avatars/straight-leg-raise.fbx' },
    defaultVariant: 'standard',
  },
  'lateral-raise': {
    label: 'Seitliches Armheben',
    cameraPos: [192, 115, 168],
    cameraTarget: [0, 85, 0],
    tips: ['Arm seitlich bis Schulterhöhe heben', 'Kontrolliert absenken', 'Nicht schwungholen'],
    variants: { standard: '/avatars/lateral-raise.fbx' },
    defaultVariant: 'standard',
  },
  'clamshell': {
    label: 'Clamshell',
    cameraPos: [210, 90, 60],
    cameraTarget: [20, 20, 0],
    tips: ['Füße bleiben aufeinander', 'Oberes Knie öffnen, Becken rollt nicht nach hinten', 'Langsam schließen'],
    variants: { standard: '/avatars/clamshell.fbx' },
    defaultVariant: 'standard',
  },
  'side-lying-leg-raise': {
    label: 'Seitliches Beinanheben',
    cameraPos: [220, 80, 90],
    cameraTarget: [0, 25, 15],
    tips: ['Oberes Bein gestreckt, leicht hinter der Körperlinie', 'Fußspitze zeigt nach vorn', 'Heben, kurz halten, langsam senken'],
    variants: { standard: '/avatars/side-lying-leg-raise.fbx' },
    defaultVariant: 'standard',
  },
  'standing-hip-extension': {
    label: 'Hüftextension im Stand',
    cameraPos: [324, 133, 194],
    cameraTarget: [0, 85, -10],
    tips: ['Gewicht aufs Standbein, Knie locker', 'Gestrecktes Bein nach hinten heben, Gesäß anspannen', 'Kein Hohlkreuz, Becken bleibt waagerecht'],
    variants: { standard: '/avatars/standing-hip-extension.fbx' },
    defaultVariant: 'standard',
  },
  'piriformis-stretch': {
    label: 'Piriformis-Dehnung',
    cameraPos: [-120, 110, 90],
    cameraTarget: [0, 30, 5],
    tips: ['Knöchel knapp über dem Knie ablegen, Fuß anziehen', 'Hände hinter den Oberschenkel, sanft zur Brust ziehen', 'Kopf und Schultern bleiben am Boden, ruhig atmen'],
    variants: { standard: '/avatars/piriformis-stretch.fbx' },
    defaultVariant: 'standard',
  },
  'neck-stretch': {
    label: 'Nackendehnung',
    cameraPos: [140, 130, 130],
    cameraTarget: [0, 130, 0],
    tips: ['Kopf sanft zur Seite neigen', 'Dehnung spüren, nicht ziehen', 'Schultern entspannt lassen'],
    variants: { standard: '/avatars/neck-stretch.fbx' },
    defaultVariant: 'standard',
  },
  'calf-raise': {
    label: 'Wadenheben',
    cameraPos: [216, 120, 228],
    cameraTarget: [0, 88, 0],
    tips: ['Langsam über den Fußballen hochdrücken', 'Oben kurz halten', 'Kontrolliert absenken'],
    variants: { standard: '/avatars/calf-raise.fbx' },
    defaultVariant: 'standard',
  },
  'plank': {
    label: 'Planke',
    cameraPos: [210, 70, 60],
    cameraTarget: [0, 20, 15],
    tips: ['Ellbogen unter den Schultern', 'Körper bildet eine Linie von Kopf bis Ferse', 'Bauch und Gesäß fest, ruhig weiteratmen'],
    variants: { standard: '/avatars/plank.fbx' },
    defaultVariant: 'standard',
  },
  'side-plank': {
    label: 'Seitstütz',
    cameraPos: [40, 90, 230],
    cameraTarget: [0, 20, 0],
    tips: ['Ellbogen unter der Schulter', 'Becken anheben, bis der Körper eine Linie bildet', 'Seiten wechseln'],
    variants: { standard: '/avatars/side-plank.fbx' },
    defaultVariant: 'standard',
  },
  'dead-bug': {
    label: 'Dead Bug',
    cameraPos: [180, 110, 120],
    cameraTarget: [0, 30, -5],
    tips: ['Unterer Rücken bleibt am Boden', 'Gegengleich Arm und Bein langsam strecken', 'Beim Strecken ausatmen'],
    variants: { standard: '/avatars/dead-bug.fbx' },
    defaultVariant: 'standard',
  },
  'pelvic-tilt': {
    label: 'Beckenkippung',
    cameraPos: [190, 70, 60],
    cameraTarget: [0, 15, -10],
    tips: ['Beim Ausatmen den unteren Rücken sanft in den Boden drücken', 'Beim Einatmen ein kleines Hohlkreuz', 'Brustkorb und Kopf bleiben liegen'],
    variants: { standard: '/avatars/pelvic-tilt.fbx' },
    defaultVariant: 'standard',
  },
  'superman': {
    label: 'Superman',
    cameraPos: [210, 80, 90],
    cameraTarget: [0, 15, 0],
    tips: ['Arme, Brust und Beine gleichzeitig wenige Zentimeter anheben', 'Blick bleibt zum Boden', 'Kurz halten, kontrolliert ablegen'],
    variants: { standard: '/avatars/superman.fbx' },
    defaultVariant: 'standard',
  },
  'curl-up': {
    label: 'Bauchpresse (Curl-up)',
    cameraPos: [170, 90, 110],
    cameraTarget: [0, 20, -10],
    tips: ['Beim Ausatmen Kopf und Schulterblätter abheben', 'Unterer Rücken bleibt am Boden', 'Kinn leicht zur Brust, Nacken locker'],
    variants: { standard: '/avatars/curl-up.fbx' },
    defaultVariant: 'standard',
  },
  'single-leg-bridge': {
    label: 'Einbeinige Brücke',
    cameraPos: [160, 110, 95],
    cameraTarget: [0, 38, 5],
    tips: ['Ein Bein in Verlängerung des Oberschenkels strecken', 'Becken bleibt waagerecht', 'Langsam Wirbel für Wirbel ablegen'],
    variants: { standard: '/avatars/single-leg-bridge.fbx' },
    defaultVariant: 'standard',
  },
  'sphinx': {
    label: 'Sphinx-Dehnung',
    cameraPos: [190, 80, 90],
    cameraTarget: [0, 20, -25],
    tips: ['Ellbogen unter den Schultern', 'Becken bleibt am Boden, Rücken locker lassen', 'Ruhig weiteratmen'],
    variants: { standard: '/avatars/sphinx.fbx' },
    defaultVariant: 'standard',
  },
  'childs-pose': {
    label: 'Kindhaltung',
    cameraPos: [180, 100, 120],
    cameraTarget: [0, 25, -5],
    tips: ['Gesäß Richtung Fersen sinken lassen – nur so weit, wie es angenehm ist', 'Oberkörper auf den Oberschenkeln ablegen, Arme lang', 'In den Rücken atmen'],
    variants: { standard: '/avatars/childs-pose.fbx' },
    defaultVariant: 'standard',
  },
  'quadruped-neutral': {
    label: 'Vierfüßler Beckenneutral',
    cameraPos: [190, 100, 130],
    cameraTarget: [0, 40, -5],
    tips: ['Hände unter den Schultern, Knie unter der Hüfte', 'Rücken neutral – weder rund noch hohl', 'Bauch leicht anspannen, ruhig atmen'],
    variants: { standard: '/avatars/quadruped-neutral.fbx' },
    defaultVariant: 'standard',
  },
  'prone-ytw': {
    label: 'Prone Y-T-W',
    cameraPos: [60, 150, 170],
    cameraTarget: [0, 5, 15],
    tips: ['Stirn bleibt auf dem Boden', 'Arme nur wenige Zentimeter anheben, Daumen zeigen nach oben', 'Schulterblätter nach hinten-unten ziehen'],
    variants: { standard: '/avatars/prone-ytw.fbx' },
    defaultVariant: 'standard',
  },
  'side-lying-external-rotation': {
    label: 'Außenrotation in Seitlage',
    cameraPos: [200, 110, 90],
    cameraTarget: [10, 30, 15],
    tips: ['Ellbogen bleibt am Körper, 90° gebeugt', 'Unterarm langsam Richtung Decke drehen', 'Kontrolliert zurück, Schulter bleibt unten'],
    variants: { standard: '/avatars/side-lying-external-rotation.fbx' },
    defaultVariant: 'standard',
  },
  'wall-angels': {
    label: 'Wandengel',
    cameraPos: [192, 109, 168],
    cameraTarget: [0, 85, 0],
    tips: ['Rücken und Arme bleiben an der Wand', 'Langsam auf und ab führen', 'Schulterblätter stabil halten'],
    variants: { standard: '/avatars/wall-angels.fbx' },
    defaultVariant: 'standard',
  },
  'heel-slides': {
    label: 'Fersenrutschen',
    cameraPos: [170, 110, 130],
    cameraTarget: [0, 20, 10],
    tips: ['Ferse langsam am Boden entlang wegschieben', 'Becken bleibt ruhig', 'Kontrolliert zurückziehen, Seiten wechseln'],
    variants: { standard: '/avatars/heel-slides.fbx' },
    defaultVariant: 'standard',
  },
  'lateral-lunge': {
    label: 'Seitlicher Ausfallschritt',
    cameraPos: [180, 139, 312],
    cameraTarget: [0, 85, 0],
    tips: ['Großer Schritt zur Seite, Fuß setzt flach auf', 'Knie über dem Fuß beugen, Hüfte nach hinten', 'Anderes Bein bleibt gestreckt, Sohle am Boden'],
    variants: { standard: '/avatars/lateral-lunge.fbx' },
    defaultVariant: 'standard',
  },
  'lunge': {
    label: 'Ausfallschritt',
    cameraPos: [348, 123, 148],
    cameraTarget: [0, 85, 40],
    tips: ['Großer Schritt nach vorn', 'Vorderes Knie über dem Fuß', 'Oberkörper aufrecht'],
    variants: { standard: '/avatars/lunge.fbx' },
    defaultVariant: 'standard',
  },
  'supine-chin-tuck': {
    label: 'Nacken-Retraktion im Liegen',
    cameraPos: [110, 45, -95],
    cameraTarget: [0, 12, -50],
    tips: ['Kinn sanft Richtung Brust ziehen (Doppelkinn)', 'Nacken wird lang, Hinterkopf bleibt liegen', '5 Sekunden halten, lösen'],
    variants: { standard: '/avatars/supine-chin-tuck.fbx' },
    defaultVariant: 'standard',
  },
  'butterfly-stretch': {
    label: 'Schmetterlingsdehnung',
    cameraPos: [70, 70, 160],
    cameraTarget: [0, 30, 10],
    tips: ['Aufrecht sitzen, Fußsohlen aneinander', 'Mit geradem Rücken aus der Hüfte nach vorn neigen', 'Knie mit den Ellbogen sanft Richtung Boden drücken'],
    variants: { standard: '/avatars/butterfly-stretch.fbx' },
    defaultVariant: 'standard',
  },
  'quadruped-rock': {
    label: 'Beckenschaukel im Vierfüßler',
    cameraPos: [200, 90, 60],
    cameraTarget: [0, 35, -10],
    tips: ['Gesäß langsam Richtung Fersen schaukeln', 'Rücken bleibt neutral, Hände bleiben am Platz', 'Wieder nach vorn über die Hände'],
    variants: { standard: '/avatars/quadruped-rock.fbx' },
    defaultVariant: 'standard',
  },
  'sumo-squat': {
    label: 'Sumo-Kniebeuge',
    cameraPos: [204, 127, 252],
    cameraTarget: [0, 85, 0],
    tips: ['Weiter Stand, Fußspitzen leicht nach außen', 'Knie schieben über die Fußspitzen nach außen', 'Oberkörper aufrecht, bis die Oberschenkel etwa waagerecht sind'],
    variants: { standard: '/avatars/sumo-squat.fbx' },
    defaultVariant: 'standard',
  },
};

function resolveAvatarPath(config: ExerciseConfig, bodyType: BodyType): string {
  return config.variants[bodyType] ?? config.variants[config.defaultVariant]!;
}

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
      // FBX-Exporte (Mixamo wie Blender) enthalten oft zusätzlich einen leeren
      // Clip ohne Spuren; den echten nehmen, sonst steht der Avatar still.
      const clip = fbx.animations.find((a) => a.tracks.length > 0) ?? fbx.animations[0];
      const action = mixer.current.clipAction(clip);
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
      <meshStandardMaterial color="#5fa89f" wireframe />
    </mesh>
  );
}

// ── Beleuchtung + Boden ───────────────────────────────────────────────────────
function Environment() {
  return (
    <>
      <color attach="background" args={['#f5f8f7']} />
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
        <meshStandardMaterial color="#d3dedb" />
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
function Scene({ config, avatarPath }: { config: ExerciseConfig; avatarPath: string }) {
  return (
    <>
      <Environment />
      <Suspense fallback={<LoadingMesh />}>
        <AvatarModel path={avatarPath} />
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
  // Optionale Vorauswahl, z. B. abgeleitet aus einer bereits vom
  // Therapeuten zugewiesenen ExerciseAdaptation (siehe
  // ADAPTATION_LABEL_TO_VARIANT in ProgramItemEditor.tsx/PatientPortalPage.tsx).
  // Bleibt manuell überschreibbar — keine Sperre, keine automatische
  // Ableitung aus Patientenmerkmalen, nur eine Voreinstellung passend zu
  // einer bereits explizit getroffenen Entscheidung.
  preferredVariant?: BodyType;
}

// Exakte Zuordnung statt Schlüsselwort-Raten: mit wachsendem Übungskatalog
// (aktuell 83) würde Substring-Matching zunehmend Fehltreffer produzieren.
// Neue Avatare ergänzen: Zeile hier + Eintrag in EXERCISES, keine Logik-Änderung nötig.
const EXERCISE_NAME_TO_KEY: Record<string, ExerciseKey> = {
  'Liegestütze': 'push-up',
  'Joggen': 'jogging',
  'Kniebeuge': 'squat',
  // „Planke“ zeigte früher fälschlich auf circle-crunch.fbx – jetzt plank.fbx (Unterarmstütz).
  'Brücke': 'bridge',
  'Vierfüßlerstand – Arm-/Beinstreckung (Bird-Dog)': 'bird-dog',
  'Katze-Kuh (Mobilisation LWS)': 'cat-cow',
  'McKenzie-Extension (Prone Press-Up)': 'mckenzie',
  'Knie zur Brust': 'knee-to-chest',
  'Rumpfrotation im Liegen': 'supine-rotation',
  'Hüftbeuger-Dehnung (Kniender Ausfallschritt)': 'hip-flexor-stretch',
  'Wandsitz': 'wall-sit',
  'Mini-Squat': 'mini-squat',
  'Gestrecktes Beinanheben (Straight Leg Raise)': 'straight-leg-raise',
  'Seitliches Anheben (Lateral Raise)': 'lateral-raise',
  'Clamshell': 'clamshell',
  'Seitliches Beinanheben': 'side-lying-leg-raise',
  'Hüftextension im Stand': 'standing-hip-extension',
  'Piriformis-Dehnung': 'piriformis-stretch',
  'HWS-Seitwärtsneigung': 'neck-stretch',
  'Fersenstand (Calf Raise)': 'calf-raise',
  'Planke': 'plank',
  'Seitstütz': 'side-plank',
  'Dead Bug': 'dead-bug',
  'Beckenkippung im Rückenliegen': 'pelvic-tilt',
  'Superman (Rückenextension in Bauchlage)': 'superman',
  'Bauchpresse (Curl-up)': 'curl-up',
  'Einbeinige Brücke': 'single-leg-bridge',
  'Sphinx-Dehnung': 'sphinx',
  'Kindhaltung': 'childs-pose',
  'Vierfüßler Beckenneutral-Halten': 'quadruped-neutral',
  'Prone Y-T-W am Boden': 'prone-ytw',
  'Außenrotation in Seitlage': 'side-lying-external-rotation',
  'Wand-Engel': 'wall-angels',
  'Fersenrutschen (Heel Slides)': 'heel-slides',
  'Seitlicher Ausfallschritt': 'lateral-lunge',
  'Ausfallschritt vorwärts': 'lunge',
  'Nacken-Retraktion im Liegen': 'supine-chin-tuck',
  'Schmetterlingsdehnung': 'butterfly-stretch',
  'Beckenschaukel im Vierfüßler': 'quadruped-rock',
  'Sumo-Kniebeuge': 'sumo-squat',
};

function getExerciseKey(name: string): ExerciseKey | null {
  return EXERCISE_NAME_TO_KEY[name] ?? null;
}

export function ExerciseAvatar3D({ exerciseName, preferredVariant }: Props) {
  const [open, setOpen] = useState(false);
  const key = getExerciseKey(exerciseName);
  const config = key ? EXERCISES[key] : null;
  // Bewusst lokaler, manuell gesetzter State — kein Ableiten aus
  // Patientenmerkmalen (Alter, o.ä.). Gleiches Prinzip wie bei den
  // Übungs-Anpassungen (AdaptationPicker.tsx): die Auswahl ist immer eine
  // explizite Handlung, niemals eine automatische Zuordnung. `preferredVariant`
  // ist selbst das Ergebnis einer solchen expliziten Handlung (zugewiesene
  // Anpassung) und bleibt jederzeit manuell überschreibbar.
  const [bodyType, setBodyType] = useState<BodyType>(preferredVariant ?? config?.defaultVariant ?? 'standard');

  useEffect(() => {
    if (preferredVariant) setBodyType(preferredVariant);
  }, [preferredVariant]);

  if (!key || !config) return null;

  const availableBodyTypes = BODY_TYPE_ORDER.filter((bt) => config.variants[bt]);
  const avatarPath = resolveAvatarPath(config, bodyType);

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-800 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
        {open ? 'Ausführung ausblenden' : 'Ausführung ansehen (3D)'}
      </button>

      {open && (
        <div className="mt-3 rounded-xl overflow-hidden border border-primary-100 bg-primary-50">
          {availableBodyTypes.length > 1 && (
            <div className="flex gap-1.5 px-3 pt-3">
              {availableBodyTypes.map((bt) => (
                <button
                  key={bt}
                  type="button"
                  onClick={() => setBodyType(bt)}
                  className={`text-[11px] font-medium px-2 py-1 rounded-full transition-colors ${
                    bodyType === bt
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-primary-700 border border-primary-200 hover:bg-primary-100'
                  }`}
                >
                  {BODY_TYPE_LABELS[bt]}
                </button>
              ))}
            </div>
          )}

          {/* 3D Canvas */}
          <div style={{ height: 320 }}>
            <CanvasErrorBoundary>
              <Canvas
                shadows
                camera={{ position: config.cameraPos, fov: 45, near: 1, far: 2000 }}
                gl={{ antialias: true, preserveDrawingBuffer: false }}
              >
                <Scene config={config} avatarPath={avatarPath} />
              </Canvas>
            </CanvasErrorBoundary>
          </div>

          {/* Steuerung-Hinweis + Tips */}
          <div className="px-4 py-3">
            <p className="text-xs text-neutral-500 mb-2 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
              </svg>
              Drehen: klicken + ziehen · Zoom: Scrollrad
            </p>
            <ul className="space-y-1">
              {config.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-1.5 text-xs text-primary-700">
                  <span className="text-primary-400 mt-0.5">✓</span>
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
