import React, { useEffect, useRef, useState } from 'react';

const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

const StaticPoolSketch: React.FC = () => (
  <svg viewBox="0 0 720 360" className="h-full w-full" role="img" aria-label="Esquema técnico de una piscina y su circuito hidráulico">
    <g fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M95 88 L490 88 L575 130 L180 130 Z" opacity="0.95" />
      <path d="M180 130 L180 252 L575 252 L575 130" opacity="0.8" />
      <path d="M95 88 L95 210 L180 252" opacity="0.6" />
      <path d="M110 107 L482 107 L548 141 L193 141 Z" opacity="0.45" />
      <path d="M105 180 C78 180 69 196 69 215 L69 279" strokeDasharray="7 7" />
      <path d="M69 279 L630 279" strokeDasharray="7 7" />
      <path d="M410 252 L410 279" strokeDasharray="7 7" />
      <circle cx="630" cy="279" r="18" />
      <rect x="584" y="245" width="28" height="68" rx="8" />
      <path d="M612 279 L612 211 L650 211" strokeDasharray="7 7" />
      <path d="M650 211 L650 147 L575 147" strokeDasharray="7 7" />
      <path d="M245 130 L245 279" strokeDasharray="7 7" opacity="0.7" />
      <path d="M500 130 L500 279" strokeDasharray="7 7" opacity="0.7" />
    </g>
    <g fill="currentColor" fontFamily="JetBrains Mono, monospace" fontSize="12">
      <text x="95" y="70">CASCO</text>
      <text x="34" y="302">SUCCIÓN</text>
      <text x="575" y="333">BOMBA / FILTRO</text>
      <text x="603" y="196">RETORNO</text>
    </g>
  </svg>
);

export const TechnicalPoolScene: React.FC<{ className?: string }> = ({ className = '' }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        void (async () => {
          try {
            const THREE: any = await import(/* @vite-ignore */ THREE_MODULE_URL);
            if (disposed || !hostRef.current) return;

            const currentHost = hostRef.current;
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
            camera.position.set(7.2, 5.4, 8.8);
            camera.lookAt(0, -0.45, 0);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
            renderer.setClearColor(0x000000, 0);
            currentHost.innerHTML = '';
            currentHost.appendChild(renderer.domElement);

            const css = getComputedStyle(document.documentElement);
            const accent = new THREE.Color(css.getPropertyValue('--accent').trim() || '#2f6d72');
            const ink = new THREE.Color(css.getPropertyValue('--ink').trim() || '#2b2f36');
            const soft = new THREE.Color(css.getPropertyValue('--ink-soft').trim() || '#5f6672');
            const good = new THREE.Color(css.getPropertyValue('--good').trim() || '#4f7a52');

            const group = new THREE.Group();
            group.rotation.x = -0.08;
            scene.add(group);

            const shellGeometry = new THREE.BoxGeometry(5.6, 1.45, 2.8, 1, 1, 1);
            const shellEdges = new THREE.EdgesGeometry(shellGeometry);
            const shell = new THREE.LineSegments(shellEdges, new THREE.LineBasicMaterial({ color: ink, transparent: true, opacity: 0.85 }));
            shell.position.y = -0.65;
            group.add(shell);

            const waterGeometry = new THREE.PlaneGeometry(5.25, 2.45);
            const waterMaterial = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.11, side: THREE.DoubleSide });
            const water = new THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            water.position.y = 0.03;
            group.add(water);

            const addPipe = (points: Array<[number, number, number]>, color: any, opacity = 0.85) => {
              const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
              const geometry = new THREE.TubeGeometry(curve, 48, 0.035, 7, false);
              const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
              const mesh = new THREE.Mesh(geometry, material);
              group.add(mesh);
              return mesh;
            };

            addPipe([
              [-2.65, -0.2, 0.8],
              [-3.35, -0.25, 0.8],
              [-3.35, -1.65, 0.8],
              [2.35, -1.65, 0.8],
              [3.15, -1.45, 0.35],
            ], accent);

            addPipe([
              [3.2, -1.45, 0.35],
              [3.2, -0.85, -0.55],
              [2.55, -0.2, -0.72],
            ], good);

            addPipe([
              [3.2, -1.45, 0.35],
              [3.4, -1.05, -0.05],
              [2.45, -0.22, 0.7],
            ], good, 0.62);

            const pump = new THREE.Mesh(
              new THREE.CylinderGeometry(0.28, 0.28, 0.55, 20),
              new THREE.MeshBasicMaterial({ color: ink, wireframe: true }),
            );
            pump.rotation.z = Math.PI / 2;
            pump.position.set(2.9, -1.45, 0.35);
            group.add(pump);

            const filter = new THREE.Mesh(
              new THREE.CylinderGeometry(0.34, 0.34, 0.9, 22),
              new THREE.MeshBasicMaterial({ color: soft, wireframe: true, transparent: true, opacity: 0.88 }),
            );
            filter.position.set(3.65, -1.2, -0.15);
            group.add(filter);

            const grid = new THREE.GridHelper(12, 24, soft, soft);
            const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
            gridMaterials.forEach((material: any) => {
              material.transparent = true;
              material.opacity = 0.09;
            });
            grid.position.y = -1.95;
            group.add(grid);

            let targetRotation = -0.22;
            let frame = 0;
            const pointerMove = (event: PointerEvent) => {
              const rect = currentHost.getBoundingClientRect();
              const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
              targetRotation = -0.42 + x * 0.42;
            };
            currentHost.addEventListener('pointermove', pointerMove);

            const resize = () => {
              const width = Math.max(currentHost.clientWidth, 1);
              const height = Math.max(currentHost.clientHeight, 1);
              camera.aspect = width / height;
              camera.updateProjectionMatrix();
              renderer.setSize(width, height, false);
            };
            resize();
            const resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(currentHost);

            const animate = () => {
              if (disposed) return;
              group.rotation.y += (targetRotation - group.rotation.y) * 0.035;
              water.position.y = 0.03 + Math.sin(performance.now() / 1800) * 0.012;
              renderer.render(scene, camera);
              frame = requestAnimationFrame(animate);
            };
            animate();
            setReady(true);

            cleanup = () => {
              cancelAnimationFrame(frame);
              resizeObserver.disconnect();
              currentHost.removeEventListener('pointermove', pointerMove);
              scene.traverse((object: any) => {
                object.geometry?.dispose?.();
                if (Array.isArray(object.material)) object.material.forEach((material: any) => material.dispose?.());
                else object.material?.dispose?.();
              });
              renderer.dispose();
              renderer.domElement.remove();
            };
          } catch (error) {
            console.warn('[TechnicalPoolScene] Three.js no disponible; se usa fallback SVG.', error);
            if (!disposed) setFailed(true);
          }
        })();
      },
      { rootMargin: '180px' },
    );

    observer.observe(host);

    return () => {
      disposed = true;
      observer.disconnect();
      cleanup?.();
    };
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ color: 'var(--accent)' }}>
      <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />
      {(!ready || failed) && (
        <div className="absolute inset-0 flex items-center justify-center opacity-80">
          <StaticPoolSketch />
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, transparent 55%, color-mix(in srgb, var(--paper) 34%, transparent) 100%)' }}
      />
    </div>
  );
};
