import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type CalendarPalette = [string, string, string, string, string];

function Calendar({ texture, palette }: { texture: THREE.CanvasTexture; palette: CalendarPalette }) {
  const group = useRef<THREE.Group>(null);
  const scroll = useRef(0);
  const reduced = useRef(false);
  const elapsed = useRef(0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => { reduced.current = media.matches; };
    const updateScroll = () => { scroll.current = Math.min(window.scrollY / 600, 1); };
    updateMotion();
    updateScroll();
    media.addEventListener("change", updateMotion);
    window.addEventListener("scroll", updateScroll, { passive: true });
    return () => {
      media.removeEventListener("change", updateMotion);
      window.removeEventListener("scroll", updateScroll);
    };
  }, []);
  useFrame((_, delta) => {
    const model = group.current;
    if (!model) return;
    const dt = Math.min(delta, 0.05);
    elapsed.current += dt;
    const progress = reduced.current ? 0 : scroll.current;
    const wave = reduced.current ? 0 : Math.sin(elapsed.current * 1.1);
    const ease = 1 - Math.exp(-7 * dt);
    model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, -0.08 + progress * 0.2, ease);
    model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, -0.2 + progress * 0.5 + wave * 0.04, ease);
    model.rotation.z = THREE.MathUtils.lerp(model.rotation.z, -0.045 + progress * 0.1, ease);
    model.position.y = THREE.MathUtils.lerp(model.position.y, wave * 0.045 - progress * 0.2, ease);
  });
  return (
    <group ref={group}>
      <RoundedBox args={[2.5, 2.7, 0.22]} radius={0.08} smoothness={3}>
        <meshStandardMaterial color={palette[2]} roughness={0.65} />
      </RoundedBox>
      <RoundedBox args={[2.45, 2.65, 0.14]} position={[0, 0.025, 0.15]} radius={0.06} smoothness={3}>
        <meshStandardMaterial color={palette[1]} roughness={0.9} />
      </RoundedBox>
      <mesh position={[0, 0.025, 0.225]}>
        <planeGeometry args={[2.4, 2.58]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 1.3, 0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14, 0.045, 8, 24]} />
          <meshStandardMaterial color={palette[3]} metalness={0.75} roughness={0.28} />
        </mesh>
      ))}
    </group>
  );
}

export default function HomeCalendarScene({ date }: { date: Date }) {
  const [art, setArt] = useState<{ texture: THREE.CanvasTexture; palette: CalendarPalette } | null>(null);
  const dateKey = date.toDateString();
  useEffect(() => {
    const host = document.querySelector(".digiverse-home");
    if (!host) return;
    const styles = getComputedStyle(host);
    const color = (token: string) => styles.getPropertyValue(token).trim();
    const palette: CalendarPalette = [color("--primary"), color("--background"), color("--muted-foreground"), color("--accent"), color("--foreground")];
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 516;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.fillStyle = palette[1];
    context.fillRect(0, 0, 480, 516);
    context.fillStyle = palette[0];
    context.fillRect(0, 0, 480, 122);
    context.textAlign = "center";
    context.fillStyle = palette[1];
    context.font = "600 35px sans-serif";
    context.fillText(date.toLocaleDateString("en-IN", { month: "long" }).toUpperCase(), 240, 80);
    context.fillStyle = palette[4];
    context.font = "600 184px sans-serif";
    context.fillText(String(date.getDate()).padStart(2, "0"), 240, 327);
    context.fillStyle = palette[0];
    context.font = "500 29px sans-serif";
    context.fillText(date.toLocaleDateString("en-IN", { weekday: "long" }), 240, 390);
    context.fillStyle = palette[2];
    context.font = "26px sans-serif";
    context.fillText(String(date.getFullYear()), 240, 449);
    context.fillStyle = palette[3];
    context.fillRect(192, 477, 96, 4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    setArt({ texture, palette });
    return () => texture.dispose();
  }, [dateKey]);
  if (!art) return null;
  return (
    <Canvas camera={{ position: [0, 0, 7], fov: 31 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[3, 5, 5]} intensity={2} />
      <Environment resolution={64}>
        <Lightformer intensity={2} position={[0, 4, 3]} scale={[5, 5, 1]} />
      </Environment>
      <Calendar texture={art.texture} palette={art.palette} />
    </Canvas>
  );
}