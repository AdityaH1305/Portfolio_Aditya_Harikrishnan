"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* ══════════════════════════════════════════════════════
   Premium Three.js Orb
   
   Dark metallic sphere with:
   - Subtle internal energy (gold emissive)
   - 3 tilted orbital rings
   - Tiny particles moving along orbital paths
   - Slow elegant rotation
   - Subtle pulse every ~4 seconds
   ══════════════════════════════════════════════════════ */

const GOLD = new THREE.Color("#D4AF37");
const DARK = new THREE.Color("#0a0a0a");

/* ── Core Sphere — dark metallic with gold inner energy ── */
function CoreSphere() {
    const meshRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime();

        if (meshRef.current) {
            meshRef.current.rotation.y = t * 0.08;
            meshRef.current.rotation.x = t * 0.03;

            // Subtle emissive pulse every ~4 seconds
            const mat = meshRef.current.material as THREE.MeshStandardMaterial;
            const pulse = Math.sin(t * 1.6) * 0.5 + 0.5; // 0→1 cycle ~4s
            mat.emissiveIntensity = 0.15 + pulse * 0.12;
        }

        if (glowRef.current) {
            const mat = glowRef.current.material as THREE.MeshStandardMaterial;
            const pulse = Math.sin(t * 1.6) * 0.5 + 0.5;
            mat.opacity = 0.02 + pulse * 0.015;
        }
    });

    return (
        <group>
            {/* Main sphere — dark, metallic */}
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1.3, 3]} />
                <meshStandardMaterial
                    color={DARK}
                    emissive={GOLD}
                    emissiveIntensity={0.15}
                    metalness={0.9}
                    roughness={0.35}
                    transparent
                    opacity={0.92}
                />
            </mesh>
            {/* Wireframe overlay for depth */}
            <mesh rotation-x={0.3} rotation-z={0.2}>
                <icosahedronGeometry args={[1.32, 2]} />
                <meshStandardMaterial
                    color="#000000"
                    emissive={GOLD}
                    emissiveIntensity={0.08}
                    wireframe
                    transparent
                    opacity={0.12}
                />
            </mesh>
            {/* Inner glow shell */}
            <mesh ref={glowRef}>
                <sphereGeometry args={[1.6, 32, 32]} />
                <meshStandardMaterial
                    color={GOLD}
                    transparent
                    opacity={0.02}
                    side={THREE.BackSide}
                />
            </mesh>
            <pointLight color="#D4AF37" intensity={0.3} distance={8} />
        </group>
    );
}

/* ── Orbital Ring — thin ring geometry with tilt ── */
function OrbitalRing({
    radius,
    tiltX,
    tiltZ,
    speed,
}: {
    radius: number;
    tiltX: number;
    tiltZ: number;
    speed: number;
}) {
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (ringRef.current) {
            ringRef.current.rotation.z = tiltZ + clock.getElapsedTime() * speed * 0.3;
        }
    });

    return (
        <mesh ref={ringRef} rotation-x={tiltX} rotation-z={tiltZ}>
            <torusGeometry args={[radius, 0.008, 16, 128]} />
            <meshStandardMaterial
                color={GOLD}
                emissive={GOLD}
                emissiveIntensity={0.3}
                transparent
                opacity={0.2}
            />
        </mesh>
    );
}

/* ── Orbital Particles — tiny dots along ring paths ── */
function OrbitalParticles({
    count,
    radius,
    tiltX,
    tiltZ,
    speed,
}: {
    count: number;
    radius: number;
    tiltX: number;
    tiltZ: number;
    speed: number;
}) {
    const ref = useRef<THREE.Points>(null);

    const positions = useMemo(() => {
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            arr[i * 3] = Math.cos(angle) * radius;
            arr[i * 3 + 1] = 0;
            arr[i * 3 + 2] = Math.sin(angle) * radius;
        }
        return arr;
    }, [count, radius]);

    useFrame(({ clock }) => {
        if (!ref.current) return;
        const t = clock.getElapsedTime() * speed;
        const geo = ref.current.geometry;
        const pos = geo.attributes.position.array as Float32Array;

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + t;
            // Slight radial variation for organic feel
            const r = radius + Math.sin(angle * 3 + t) * 0.03;
            pos[i * 3] = Math.cos(angle) * r;
            pos[i * 3 + 1] = Math.sin(angle * 5 + t * 0.7) * 0.02;
            pos[i * 3 + 2] = Math.sin(angle) * r;
        }
        geo.attributes.position.needsUpdate = true;
    });

    return (
        <points ref={ref} rotation-x={tiltX} rotation-z={tiltZ}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                    count={count}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                color="#D4AF37"
                size={0.025}
                transparent
                opacity={0.6}
                sizeAttenuation
            />
        </points>
    );
}

/* ── OrbScene — core sphere with single orbital ring ── */
function OrbScene() {
    const groupRef = useRef<THREE.Group>(null);

    useFrame(({ clock }) => {
        if (groupRef.current) {
            // Very slow elegant rotation
            groupRef.current.rotation.y = clock.getElapsedTime() * 0.06;
        }
    });

    return (
        <group ref={groupRef}>
            <CoreSphere />

            {/* Single orbital ring — reads as system trace, not planetary decoration */}
            <OrbitalRing radius={2.2} tiltX={Math.PI * 0.55} tiltZ={-0.4} speed={-0.3} />

            {/* Sparse particles on the single ring — suggests data flow, not spectacle */}
            <OrbitalParticles count={12} radius={2.2} tiltX={Math.PI * 0.55} tiltZ={-0.4} speed={-0.18} />
        </group>
    );
}

/* ══════════════════════════════════════════════════════
   Exported Orb Component
   
   Props:
   - className: wrapper CSS class
   - scale: overall scale factor (default 1)
   - opacity: wrapper opacity (default 1)
   ══════════════════════════════════════════════════════ */
interface OrbProps {
    className?: string;
    style?: React.CSSProperties;
}

export default function Orb({ className = "", style }: OrbProps) {
    return (
        <div className={`orb-wrapper ${className}`} style={style}>
            <Canvas
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 6.5], fov: 45 }}
                gl={{ alpha: true, antialias: true }}
                style={{ pointerEvents: "none" }}
            >
                <ambientLight intensity={0.3} />
                <directionalLight position={[5, 3, 5]} intensity={0.2} color="#FAFAFA" />
                <OrbScene />
            </Canvas>
        </div>
    );
}
