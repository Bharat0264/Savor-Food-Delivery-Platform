"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows, RoundedBox } from "@react-three/drei";
import { useRef, useEffect } from "react";
import gsap from "gsap";
import * as THREE from "three";
function Rice() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    if (!ref.current) return;
    const object = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < 650; i++) {
      const a = i * 2.39996;
      const r = Math.sqrt(i / 650) * 1.59;
      object.position.set(
        Math.cos(a) * r,
        -0.24 + Math.sin(i * 7) * 0.025,
        Math.sin(a) * r,
      );
      object.rotation.set(0, i * 1.4, 0.12);
      object.scale.set(0.065, 0.025, 0.024);
      object.updateMatrix();
      ref.current.setMatrixAt(i, object.matrix);
      ref.current.setColorAt(
        i,
        color.set(
          i % 5 === 0 ? "#ba945d" : i % 3 === 0 ? "#dfc997" : "#f2dfb7",
        ),
      );
    }
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 650]}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}
function Bowl() {
  const group = useRef<THREE.Group>(null);
  const scroll = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      scroll.current = Math.min(1, window.scrollY / window.innerHeight);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const tween = group.current
      ? gsap.fromTo(
          group.current.scale,
          { x: 0.65, y: 0.65, z: 0.65 },
          { x: 1, y: 1, z: 1, duration: 1.5, ease: "power3.out" },
        )
      : null;
    return () => {
      window.removeEventListener("scroll", onScroll);
      tween?.kill();
    };
  }, []);
  useFrame(({ clock, pointer, camera }) => {
    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      pointer.x * 0.3,
      0.03,
    );
    camera.lookAt(0, 0, 0);
    if (group.current) {
      group.current.rotation.y =
        clock.elapsedTime * 0.08 + pointer.x * 0.15 + scroll.current * 0.8;
      group.current.rotation.z = pointer.y * 0.04;
    }
  });
  return (
    <group ref={group} rotation={[0.22, 0, 0.12]}>
      <mesh position={[0, -0.38, 0]}>
        <sphereGeometry
          args={[1.72, 64, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
        <meshStandardMaterial
          color="#e5dbc9"
          roughness={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
        <torusGeometry args={[1.72, 0.075, 16, 80]} />
        <meshStandardMaterial color="#faf4e7" roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.64, 64]} />
        <meshStandardMaterial color="#d6bd8d" />
      </mesh>
      <Rice />
      {Array.from({ length: 22 }, (_, i) => {
        const a = i * 2.39;
        return (
          <group
            key={i}
            position={[
              Math.cos(a) * (0.4 + (i % 3) * 0.4),
              -0.03 + Math.sin(i) * 0.13,
              Math.sin(a) * (0.4 + (i % 3) * 0.4),
            ]}
            rotation={[0.2, i, 0.2]}
          >
            <mesh scale={[0.32, 0.055, 0.19]} rotation={[0, 0, 0.35]}>
              <sphereGeometry args={[1, 24, 16]} />
              <meshStandardMaterial
                color={i % 2 ? "#518347" : "#8aaf48"}
                roughness={0.8}
              />
            </mesh>
            <mesh
              position={[0, 0.025, 0]}
              rotation={[0, 0, 0.35]}
              scale={[0.26, 0.012, 0.015]}
            >
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color="#c4d28d" />
            </mesh>
          </group>
        );
      })}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh
          key={`tomato${i}`}
          position={[Math.cos(i * 2.4) * 1.15, 0.13, Math.sin(i * 2.4) * 1.12]}
          scale={[0.18, 0.15, 0.17]}
        >
          <sphereGeometry args={[1, 20, 16]} />
          <meshStandardMaterial
            color={i % 2 ? "#df4d29" : "#f6ab36"}
            roughness={0.25}
          />
        </mesh>
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <RoundedBox
          args={[0.3, 0.2, 0.29]}
          radius={0.04}
          smoothness={3}
          key={`tofu${i}`}
          position={[
            -0.6 + (i % 3) * 0.36,
            0.14,
            Math.floor(i / 3) * 0.35 - 0.5,
          ]}
          rotation={[0.1, i * 0.6, 0.1]}
        >
          <meshStandardMaterial color="#bd733e" roughness={0.8} />
        </RoundedBox>
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={`avocado${i}`}
          position={[0.4 + i * 0.1, 0.23 + i * 0.025, 0.2]}
          rotation={[Math.PI / 2, 0.15, 1.1]}
        >
          <torusGeometry args={[0.42, 0.09, 12, 28, Math.PI * 0.85]} />
          <meshStandardMaterial color="#b8c969" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 4.5, 6], fov: 39 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      aria-label="Interactive 3D handcrafted vegetable bowl"
    >
      <ambientLight intensity={1.5} />
      <directionalLight position={[4, 8, 4]} intensity={3} />
      <pointLight position={[-4, 2, 1]} color="#d9ef7b" intensity={8} />
      <Float speed={1.5} rotationIntensity={0.16} floatIntensity={0.35}>
        <Bowl />
      </Float>
      <Float speed={2} floatIntensity={1}>
        <mesh position={[-2.1, 1.3, 0.2]} rotation={[1, 0, 0.5]}>
          <torusGeometry args={[0.32, 0.08, 12, 40]} />
          <meshStandardMaterial color="#dc6844" />
        </mesh>
        <mesh
          position={[2, 1, -0.4]}
          scale={[0.3, 0.06, 0.5]}
          rotation={[0.7, 0, 0.6]}
        >
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#5c843b" />
        </mesh>
      </Float>
      <ContactShadows
        position={[0, -1.65, 0]}
        opacity={0.3}
        scale={10}
        blur={2.7}
        far={4}
      />
    </Canvas>
  );
}
