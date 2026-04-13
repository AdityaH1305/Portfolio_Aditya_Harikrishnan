"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

/* ── Navigation labels and their target section IDs ── */
const NAV_ITEMS = [
    { label: "Home", target: "home" },
    { label: "About", target: "about" },
    { label: "Build", target: "build" },
    { label: "Projects", target: "projects" },
    { label: "Contact", target: "contact" },
];

/* ── Glowing Core Sphere ── */
function CoreSphere() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.15;
            meshRef.current.rotation.x += delta * 0.05;
        }
    });

    return (
        <group>
            {/* Inner core */}
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1, 1]} />
                <meshStandardMaterial
                    color="#4f46e5"
                    emissive="#6366f1"
                    emissiveIntensity={0.6}
                    wireframe
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* Outer glow shell */}
            <mesh>
                <icosahedronGeometry args={[1.3, 1]} />
                <meshStandardMaterial
                    color="#818cf8"
                    transparent
                    opacity={0.05}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Point light at center for glow effect */}
            <pointLight color="#6366f1" intensity={2} distance={8} />
        </group>
    );
}

/* ── Single Orbiting Label ── */
function OrbitLabel({
    label,
    target,
    index,
    total,
}: {
    label: string;
    target: string;
    index: number;
    total: number;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const [hovered, setHovered] = useState(false);

    const baseAngle = (index / total) * Math.PI * 2;
    const radius = 2.4;
    const speed = 0.2 + index * 0.03;
    const yOffset = (index % 2 === 0 ? 0.3 : -0.3) * (index % 3 === 0 ? 1 : -1);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.getElapsedTime() * speed + baseAngle;
        groupRef.current.position.x = Math.cos(t) * radius;
        groupRef.current.position.z = Math.sin(t) * radius;
        groupRef.current.position.y = Math.sin(t * 0.8 + index) * 0.4 + yOffset * 0.3;
    });

    const handleClick = () => {
        const el = document.getElementById(target);
        if (el) el.scrollIntoView({ behavior: "smooth" });
    };

    return (
        <group ref={groupRef}>
            <Html center distanceFactor={6}>
                <button
                    onClick={handleClick}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    className="orb-label"
                    style={{
                        background: hovered
                            ? "rgba(99, 102, 241, 0.25)"
                            : "rgba(255, 255, 255, 0.06)",
                        border: `1px solid ${hovered ? "rgba(129, 140, 248, 0.6)" : "rgba(255, 255, 255, 0.12)"}`,
                        color: hovered ? "#c7d2fe" : "#94a3b8",
                        padding: "6px 16px",
                        borderRadius: "999px",
                        fontSize: "13px",
                        fontFamily: "inherit",
                        fontWeight: 500,
                        letterSpacing: "0.5px",
                        cursor: "pointer",
                        backdropFilter: "blur(8px)",
                        transition: "all 0.3s ease",
                        transform: hovered ? "scale(1.2)" : "scale(1)",
                        boxShadow: hovered
                            ? "0 0 20px rgba(99, 102, 241, 0.3)"
                            : "none",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </button>
            </Html>
        </group>
    );
}

/* ── Subtle mouse parallax on camera ── */
function CameraParallax() {
    const { camera } = useThree();
    const mouse = useRef({ x: 0, y: 0 });

    useFrame(() => {
        camera.position.x += (mouse.current.x * 0.5 - camera.position.x) * 0.05;
        camera.position.y += (mouse.current.y * 0.3 - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);
    });

    return (
        <mesh
            visible={false}
            onPointerMove={(e) => {
                mouse.current.x = (e.point.x / 5);
                mouse.current.y = (e.point.y / 5);
            }}
        >
            <planeGeometry args={[50, 50]} />
            <meshBasicMaterial transparent opacity={0} />
        </mesh>
    );
}

/* ── Main Component ── */
export default function OrbNavigation() {
    const labels = useMemo(
        () =>
            NAV_ITEMS.map((item, i) => (
                <OrbitLabel
                    key={item.target}
                    label={item.label}
                    target={item.target}
                    index={i}
                    total={NAV_ITEMS.length}
                />
            )),
        []
    );

    return (
        <div
            className="fixed inset-0 pointer-events-none z-[5] hidden md:block"
            style={{ opacity: 0.9 }}
        >
            <Canvas
                dpr={[1, 1.5]}
                camera={{ position: [0, 0, 6], fov: 45 }}
                style={{ pointerEvents: "auto" }}
                gl={{ alpha: true, antialias: true }}
            >
                <ambientLight intensity={0.3} />
                <CoreSphere />
                {labels}
                <CameraParallax />
            </Canvas>
        </div>
    );
}
