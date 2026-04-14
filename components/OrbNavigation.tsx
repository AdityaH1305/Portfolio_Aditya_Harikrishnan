"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

const SKILLS_ITEMS = [
    "Python", "Java", "C", "C++", "JavaScript",
    "React", "Next.js", "Flask", "Node.js",
    "MySQL", "SQL", "MongoDB",
    "Machine Learning", "Deep Learning",
    "Data Structures", "Algorithms",
    "Operating Systems", "DBMS", "Computer Networks",
    "Cloud Computing", "Cryptography", "Distributed Systems",
];

/* ── Dual-Layer Spherical Distribution ── */
function getDualLayerPositions(count: number) {
    const points: { pos: [number, number, number]; isOuter: boolean }[] = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    
    for (let i = 0; i < count; i++) {
        // Alternate between inner and outer orbits
        const isOuter = i % 2 !== 0;
        // Increased orbit radii to prevent overlap with larger labels (~15% increase)
        const rOrbit = isOuter ? 3.0 : 1.95; 

        const y = 1 - (2 * (i + 0.5)) / count;
        const r = Math.sqrt(1 - y * y);
        const theta = goldenAngle * i;
        points.push({
            pos: [
                rOrbit * r * Math.cos(theta),
                rOrbit * y,
                rOrbit * r * Math.sin(theta),
            ],
            isOuter,
        });
    }
    return points;
}

/* ── Glowing Core Sphere ── */
function CoreSphere() {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((_, delta) => {
        if (meshRef.current) {
            meshRef.current.rotation.y += delta * 0.12;
            meshRef.current.rotation.x += delta * 0.04;
        }
    });

    return (
        <group>
            {/* Marginally scaled up core to balance out the larger orbit */}
            <mesh ref={meshRef}>
                <icosahedronGeometry args={[1.4, 1]} />
                <meshStandardMaterial
                    color="#4f46e5"
                    emissive="#6366f1"
                    emissiveIntensity={0.5}
                    wireframe
                    transparent
                    opacity={0.7}
                />
            </mesh>
            <mesh>
                <icosahedronGeometry args={[1.75, 1]} />
                <meshStandardMaterial
                    color="#818cf8"
                    transparent
                    opacity={0.04}
                    side={THREE.BackSide}
                />
            </mesh>
            <pointLight color="#6366f1" intensity={1.5} distance={10} />
        </group>
    );
}

/* ── Skills orbit labels ── */
function SkillsOrbitLabels({
    rotationRef,
}: {
    rotationRef: React.RefObject<{ x: number; y: number }>;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const nodes = useMemo(() => getDualLayerPositions(SKILLS_ITEMS.length), []);

    useFrame(() => {
        if (!groupRef.current || !rotationRef.current) return;
        groupRef.current.rotation.y = rotationRef.current.y;
        groupRef.current.rotation.x = rotationRef.current.x;
    });

    return (
        <group ref={groupRef}>
            {SKILLS_ITEMS.map((skill, i) => {
                const { pos: [bx, by, bz], isOuter } = nodes[i];
                return (
                    <FloatingLabel key={skill} bx={bx} by={by} bz={bz} phase={i * 0.6}>
                        {(spanRef) => (
                            <span
                                ref={spanRef}
                                className={`orb-label-skill max-w-[150px] truncate inline-block ${
                                    isOuter ? "font-medium" : "font-normal"
                                }`}
                                style={{
                                    // Sizing slightly increased by ~15%
                                    fontSize: "11.5px",
                                    padding: "4px 12px",
                                    pointerEvents: "auto",
                                    willChange: "transform, opacity",
                                }}
                                onPointerDown={(e) => e.stopPropagation()}
                            >
                                {skill}
                            </span>
                        )}
                    </FloatingLabel>
                );
            })}
        </group>
    );
}

/* ── Floating label with depth-based opacity and scale + sinusoidal micro-motion ── */
function FloatingLabel({
    bx,
    by,
    bz,
    phase,
    children,
}: {
    bx: number;
    by: number;
    bz: number;
    phase: number;
    children: (ref: React.RefObject<HTMLSpanElement | null>) => React.ReactNode;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const spanRef = useRef<HTMLSpanElement>(null);

    useFrame(({ clock }) => {
        if (!groupRef.current) return;
        const t = clock.getElapsedTime();
        
        // Subtle sinusoidal oscillation around the base position
        groupRef.current.position.x = bx + Math.sin(t * 0.5 + phase) * 0.08;
        groupRef.current.position.y = by + Math.sin(t * 0.7 + phase * 1.3) * 0.1;
        groupRef.current.position.z = bz + Math.cos(t * 0.4 + phase * 0.7) * 0.06;

        // Depth perspective logic
        const wp = new THREE.Vector3();
        groupRef.current.getWorldPosition(wp);

        if (spanRef.current) {
            // Updated mapping bounds safely for max orbit z-offset of ~3.1
            const nz = (wp.z + 3.2) / 6.4; 
            const clamped = Math.max(0, Math.min(1, nz));
            
            // Refined scale boundaries to prevent giant labels at the very front
            const opacity = 0.35 + clamped * 0.65; 
            const scale = 0.8 + clamped * 0.35;   // 0.8 to 1.15
            
            spanRef.current.style.opacity = opacity.toFixed(3);
            spanRef.current.style.transform = `scale(${scale.toFixed(3)})`;
            spanRef.current.style.zIndex = Math.round(clamped * 100).toString();
        }
    });

    return (
        <group ref={groupRef}>
            <Html center zIndexRange={[100, 0]}>
                {children(spanRef)}
            </Html>
        </group>
    );
}

/* ── Drag hook ── */
function useDragRotation(autoSpeed = 0.002) {
    const rotationRef = useRef({ x: -0.2, y: 0 });
    const velocityRef = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const rafId = useRef<number>(0);

    const SENSITIVITY = 0.004;
    const DAMPING = 0.92;
    const STOP_THRESHOLD = 0.0003;
    const MAX_TILT = Math.PI / 2; // ±90° vertical clamp

    const animate = useCallback(() => {
        if (isDragging.current) {
            // While dragging, apply velocity directly (set by onPointerMove)
            rotationRef.current.y += velocityRef.current.y;
            rotationRef.current.x += velocityRef.current.x;
        } else {
            // After release, apply inertia with damping
            rotationRef.current.y += velocityRef.current.y;
            rotationRef.current.x += velocityRef.current.x;

            velocityRef.current.y *= DAMPING;
            velocityRef.current.x *= DAMPING;

            // Once velocity is negligible, resume auto-rotation
            if (
                Math.abs(velocityRef.current.y) < STOP_THRESHOLD &&
                Math.abs(velocityRef.current.x) < STOP_THRESHOLD
            ) {
                velocityRef.current.y = 0;
                velocityRef.current.x = 0;
                rotationRef.current.y += autoSpeed;
            }
        }

        // Always clamp vertical tilt
        rotationRef.current.x = Math.max(-MAX_TILT, Math.min(MAX_TILT, rotationRef.current.x));

        rafId.current = requestAnimationFrame(animate);
    }, [autoSpeed]);

    useEffect(() => {
        rafId.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafId.current);
    }, [animate]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) return;
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        velocityRef.current = { x: 0, y: 0 };
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    }, []);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;

        // Record frame-to-frame velocity only — animate loop applies it
        velocityRef.current.y = dx * SENSITIVITY;
        velocityRef.current.x = -dy * SENSITIVITY; // Inverted: drag up → tilt up

        lastMouse.current = { x: e.clientX, y: e.clientY };
    }, []);

    const onPointerUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    return { rotationRef, onPointerDown, onPointerMove, onPointerUp };
}

/* ── Main Component ── */
export default function OrbNavigation() {
    const skillsDrag = useDragRotation(0.0015);

    return (
        <section className="orb-section hidden md:flex">
            <div className="orb-column">
                <p className="orb-title mb-4">Skills & Technologies</p>
                <div
                    className="orb-container"
                    onPointerDown={skillsDrag.onPointerDown}
                    onPointerMove={skillsDrag.onPointerMove}
                    onPointerUp={skillsDrag.onPointerUp}
                    onPointerLeave={skillsDrag.onPointerUp}
                >
                    <Canvas
                        dpr={[1, 1.5]}
                        // Camera z moved back marginally to create an extra safety buffer against clipping
                        camera={{ position: [0, 0, 8.5], fov: 45 }}
                        gl={{ alpha: true, antialias: true }}
                        style={{ pointerEvents: "none" }}
                    >
                        <ambientLight intensity={0.4} />
                        <CoreSphere />
                        <SkillsOrbitLabels rotationRef={skillsDrag.rotationRef} />
                    </Canvas>
                </div>
            </div>
        </section>
    );
}
