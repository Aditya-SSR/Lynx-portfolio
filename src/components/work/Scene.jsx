"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { PROJECTS } from "@/lib/projects";
import { CAM, SCREEN, PHONE, pxPerUnit, openRect } from "@/lib/layout";
import { useStore, motionState } from "@/lib/store";
import { useScreenVideo } from "./useScreenVideo";

const { damp, clamp, lerp } = THREE.MathUtils;
const N = PROJECTS.length;
const SPACING = 4.35;
const FACE_Z = 0.084; // distance of the display face in front of the group origin
// iPhone side buttons: action + volume up/down on the left, power on the right
const PHONE_BUTTONS = [
  { id: "action", side: -1, y: 1.08, h: 0.14 },
  { id: "volup", side: -1, y: 0.76, h: 0.3 },
  { id: "voldn", side: -1, y: 0.38, h: 0.3 },
  { id: "power", side: 1, y: 0.8, h: 0.5 },
];
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function useGeometries(dims) {
  return useMemo(() => {
    const { w, h, r, bezel } = dims;
    const face = new THREE.ShapeGeometry(roundedRect(w, h, r), 24);
    const pos = face.attributes.position;
    const uv = face.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);

    if (dims.frame) {
      // iPhone: titanium frame (outer) + black glass plate (inner bezel) + the screen
      const o = bezel + dims.frame;
      const body = new THREE.ExtrudeGeometry(roundedRect(w + o * 2, h + o * 2, r + o * 0.9), {
        depth: dims.depth,
        bevelEnabled: true,
        bevelThickness: 0.012,
        bevelSize: 0.012,
        bevelSegments: 6,
        curveSegments: 36,
      });
      const glass = new THREE.ShapeGeometry(roundedRect(w + bezel * 2, h + bezel * 2, r + bezel * 0.8), 36);
      return { face, body, glass };
    }
    const body = new THREE.ExtrudeGeometry(roundedRect(w + bezel * 2, h + bezel * 2, r + bezel * 0.7), {
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 5,
      curveSegments: 28,
    });
    return { face, body };
  }, [dims]);
}

function useCanvasTexture(draw, size = 256, configure) {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    draw(c.getContext("2d"), size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    configure?.(t);
    return t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// The dynamic island, drawn over a playing screen recording (the baked-in one only exists in the poster).
function useIslandTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 480;
    c.height = 136;
    const g = c.getContext("2d");
    g.beginPath();
    g.roundRect(2, 2, 476, 132, 66);
    g.fillStyle = "#000";
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = "rgba(255,255,255,0.10)";
    g.stroke();
    g.beginPath();
    g.arc(402, 68, 25, 0, Math.PI * 2);
    g.fillStyle = "#10141f";
    g.fill();
    g.beginPath();
    g.arc(402, 68, 9, 0, Math.PI * 2);
    g.fillStyle = "#2a3a63";
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Screen({ project, index }) {
  const tex = useTexture(project.preview);
  const isApp = project.type === "app";
  const dims = project.shape === "phone" ? PHONE : SCREEN;
  const isPhone = project.shape === "phone";
  const { face, body, glass } = useGeometries(dims);
  const faceZ = isPhone ? 0.086 : FACE_Z;
  const sheenZ = isPhone ? 0.089 : 0.087;
  const { texture: videoTex, tick: tickVideo } = useScreenVideo(project.video, dims);
  const island = useIslandTexture();
  const unit = dims.w / 390; // the phone screen is designed on a 390pt-wide grid
  const group = useRef();
  const sheen = useRef();
  const local = useRef({ open: 0, away: 0, enter: 0, t: 0 });

  const shadowTex = useCanvasTexture((ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.5, "rgba(0,0,0,0.22)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });

  const sheenTex = useCanvasTexture(
    (ctx, s) => {
      const g = ctx.createLinearGradient(0, 0, s, s * 0.35);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.38, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,0.5)");
      g.addColorStop(0.62, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, s, s);
    },
    256,
    (t) => {
      t.wrapS = THREE.RepeatWrapping;
      t.repeat.set(0.7, 1);
    }
  );

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const st = useStore.getState();
    const loc = local.current;
    const { width, height } = state.size;

    // entry choreography — screens glide up from below, staggered
    // Timed by accumulated frame time, NOT the three.js clock: the clock restarts from 0
    // whenever the canvas is paused and resumed (e.g. after closing a live site).
    if (st.phase === "entering" || st.phase === "site") {
      loc.t += Math.min(dt, 0.05);
      loc.enter = easeOutExpo(clamp((loc.t - index * 0.16) / 1.9, 0, 1));
    } else {
      loc.enter = 0;
    }

    const d = index - motionState.progress;
    const cd = clamp(d, -2.2, 2.2);
    const ad = Math.abs(cd);
    const isOpened = st.opened === project.id;
    const anyOpen = st.opened != null;

    loc.open = damp(loc.open, isOpened ? 1 : 0, 3.4, dt);
    loc.away = damp(loc.away, anyOpen && !isOpened ? 1 : 0, 3, dt);

    // base carousel pose — a diagonal drift of tilted screens
    let x = d * SPACING;
    let y = d * 0.62;
    let z = -ad * 0.95;
    let rx = 0.1 + ad * 0.05;
    let ry = -cd * 0.42;
    let rz = cd * 0.12 - 0.05;
    let s = (1 - Math.min(ad, 2) * 0.07) * (project.shape === "phone" ? 0.9 : 1);

    // portrait viewports: shrink the whole carousel so a screen fits the width
    const fit = clamp((width / height) * 1.35, 0.55, 1);
    x *= fit;
    y *= fit;
    s *= fit;

    // pointer parallax (strongest on the screen in focus). Off on narrow screens: there the tiles are
    // small and close together, so cursor-driven tilt / hover-scale / glare read as the carousel
    // drifting on its own even though nothing is scrolling.
    const calm = width < 768;
    const px = calm ? 0 : motionState.pointer.x;
    const py = calm ? 0 : motionState.pointer.y;
    const focus = 1 - Math.min(ad, 1);
    const hov = !calm && motionState.hovered === index ? 1 : 0;
    ry += px * 0.12 * focus;
    rx += -py * 0.08 * focus;
    s *= 1 + hov * 0.025 * focus;

    // entry offsets
    const e = 1 - loc.enter;
    y -= e * 7;
    z -= e * 3.5;
    rz += e * 0.45;
    s *= 0.9 + 0.1 * loc.enter;

    // others leave the stage when a site is open
    const dir = d === 0 ? 1 : Math.sign(d);
    x += dir * loc.away * 10;
    y -= loc.away * 1.4;
    z -= loc.away * 5;

    // opened screen takes the centre at exact DOM size
    if (loc.open > 0.001) {
      const o = easeInOut(loc.open);
      const ppu = pxPerUnit(height);
      const rect = openRect(width, height);
      // The display face sits FACE_Z in front of the group origin, so perspective magnifies
      // it slightly; solve for the scale at which its projected width equals the iframe.
      const target = rect.mobile ? width * 0.92 : rect.w;
      const S = (target * CAM.z) / (SCREEN.w * ppu * CAM.z + target * FACE_Z);
      x = lerp(x, 0, o);
      y = lerp(y, -rect.dy / ppu, o);
      z = lerp(z, 0, o);
      rx = lerp(rx, 0, o);
      ry = lerp(ry, 0, o);
      rz = lerp(rz, 0, o);
      s = lerp(s, S, o);
    }

    tickVideo(d, width); // lazy-load / play-when-centred (no-op for tiles without a recording)

    g.position.set(x, y, z);
    g.rotation.set(rx, ry, rz);
    g.scale.setScalar(s);

    if (sheen.current) {
      const m = sheen.current.material;
      m.map.offset.x = -d * 0.35 + px * 0.15;
      m.opacity = (0.55 - Math.min(ad, 1) * 0.25) * (1 - loc.open);
    }
  });

  const T = 0.06;
  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        motionState.hovered = index;
        const centred = Math.round(motionState.progress) === index;
        window.dispatchEvent(new CustomEvent("cursor", { detail: centred ? (isApp ? project.cta : "Open") : "View" }));
      }}
      onPointerOut={() => {
        if (motionState.hovered === index) motionState.hovered = -1;
        window.dispatchEvent(new CustomEvent("cursor", { detail: null }));
      }}
      onClick={(e) => {
        e.stopPropagation();
        const st = useStore.getState();
        if (st.opened) return;
        if (Math.round(motionState.progress) !== index) return motionState.goTo?.(index);
        // websites open live in the viewer; apps open their store page / repo in a new tab
        if (isApp) window.open(project.url, "_blank", "noopener,noreferrer");
        else st.setOpened(project.id);
      }}
    >
      {/* soft contact shadow */}
      <mesh position={[0.1, -0.55, -0.2]} renderOrder={-1}>
        <planeGeometry args={[dims.w * 1.9, dims.h * 2.1]} />
        <meshBasicMaterial map={shadowTex} transparent opacity={0.55} depthWrite={false} toneMapped={false} />
      </mesh>

      {isPhone ? (
        <>
          {/* titanium frame */}
          <mesh geometry={body} position={[0, 0, -0.02]}>
            <meshPhysicalMaterial color="#7d7c80" metalness={1} roughness={0.27} clearcoat={0.35} clearcoatRoughness={0.3} envMapIntensity={1.6} />
          </mesh>
          {/* black glass bezel */}
          <mesh geometry={glass} position={[0, 0, 0.084]}>
            <meshPhysicalMaterial color="#020203" metalness={0.25} roughness={0.08} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.2} />
          </mesh>
          {/* side buttons: action + volume (left), power (right) */}
          {PHONE_BUTTONS.map((b) => (
            <RoundedBox key={b.id} args={[0.032, b.h, 0.07]} radius={0.013} smoothness={3} position={[b.side * 0.846, b.y, 0.022]}>
              <meshPhysicalMaterial color="#7d7c80" metalness={1} roughness={0.3} envMapIntensity={1.5} />
            </RoundedBox>
          ))}
        </>
      ) : (
        <mesh geometry={body} position={[0, 0, -0.01]}>
          <meshPhysicalMaterial
            color="#111113"
            metalness={0.85}
            roughness={0.3}
            clearcoat={1}
            clearcoatRoughness={0.12}
            envMapIntensity={1.3}
          />
        </mesh>
      )}

      {/* display */}
      <mesh geometry={face} position={[0, 0, faceZ]}>
        <meshBasicMaterial toneMapped={false}>
          <primitive key={videoTex ? "video" : "image"} object={videoTex ?? tex} attach="map" colorSpace={THREE.SRGBColorSpace} anisotropy={8} />
        </meshBasicMaterial>
      </mesh>

      {/* dynamic island over the recording */}
      {isPhone && videoTex && (
        <mesh position={[0, dims.h / 2 - 31 * unit, faceZ + 0.0015]}>
          <planeGeometry args={[120 * unit, 34 * unit]} />
          <meshBasicMaterial map={island} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      )}

      {/* glass sheen */}
      <mesh ref={sheen} geometry={face} position={[0, 0, sheenZ]}>
        <meshBasicMaterial
          map={sheenTex}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function Rig({ children }) {
  const setActive = useStore((s) => s.setActive);
  useFrame((state, dt) => {
    const st = useStore.getState();
    motionState.progress = damp(motionState.progress, motionState.target, 4.5, dt);

    const idx = clamp(Math.round(motionState.progress), 0, N - 1);
    if (idx !== st.active) setActive(idx);

    // gentle camera drift, fading out as a screen opens so the DOM iframe lines up exactly
    const calm = st.opened ? 0 : 1;
    motionState.calm = damp(motionState.calm, calm, 3, dt);
    const cam = state.camera;
    const narrow = state.size.width < 768; // no cursor-driven camera drift on narrow screens
    const k = narrow ? 0 : motionState.calm;
    cam.position.x = damp(cam.position.x, motionState.pointer.x * 0.28 * k, 3, dt);
    cam.position.y = damp(cam.position.y, motionState.pointer.y * 0.18 * k, 3, dt);
    cam.lookAt(0, 0, 0);
  }, -1);
  return children;
}

export default function Scene({ active = true }) {
  // Render only while the showcase is on screen (and no live site is covering it). A canvas that keeps
  // drawing 4000px off-screen starves the rest of the page — it dropped the footer to ~5 fps.
  const covered = useStore((s) => s.opened != null && s.viewerReady);
  const paused = covered || !active;

  // tell any playing screen recording to stop while nothing is being drawn
  useEffect(() => {
    if (paused) window.dispatchEvent(new CustomEvent("scene-paused"));
  }, [paused]);

  useEffect(() => {
    const move = (e) => {
      motionState.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      motionState.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={paused ? "never" : "always"}
      camera={{ fov: CAM.fov, position: [0, 0, CAM.z], near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ position: "absolute", inset: 0 }}
    >
      <ambientLight intensity={0.5} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 6, 6]} scale={[16, 4, 1]} />
        <Lightformer form="rect" intensity={2.4} position={[-9, 1, 3]} rotation-y={Math.PI / 2} scale={[9, 6, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[9, 2, 4]} rotation-y={-Math.PI / 2} scale={[9, 6, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[0, -3, 5]} scale={6} />
      </Environment>
      <Suspense fallback={null}>
        <Rig>
          {PROJECTS.map((p, i) => (
            <Screen key={p.id} project={p} index={i} />
          ))}
        </Rig>
      </Suspense>
    </Canvas>
  );
}
