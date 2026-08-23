import React, { useEffect, useRef, useState } from 'react';

const THREE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js';

const StaticPoolSketch: React.FC = () => (
  <svg viewBox="0 0 960 520" className="h-full w-full" role="img" aria-label="Corte técnico de piscina con instalación hidráulica">
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <path d="M138 126 L604 126 L728 190 L262 190 Z" strokeWidth="2.4" opacity="0.92" />
      <path d="M262 190 L262 354 L728 354 L728 190" strokeWidth="2.1" opacity="0.76" />
      <path d="M138 126 L138 286 L262 354" strokeWidth="1.8" opacity="0.58" />
      <path d="M164 151 L596 151 L694 202 L286 202 Z" strokeWidth="1.6" opacity="0.42" />
      <path d="M177 166 L590 166 L675 210 L300 210" strokeWidth="1.2" opacity="0.28" />

      <path d="M603 190 L603 235 L667 235" strokeWidth="1.8" opacity="0.72" />
      <path d="M576 190 L576 220 L640 220" strokeWidth="1.5" opacity="0.55" />
      <path d="M550 190 L550 207 L613 207" strokeWidth="1.3" opacity="0.42" />

      <circle cx="232" cy="226" r="8" strokeWidth="2" />
      <circle cx="728" cy="248" r="7" strokeWidth="2" />
      <circle cx="728" cy="290" r="7" strokeWidth="2" />

      <path d="M232 234 C210 258 190 286 190 328 L190 405 L728 405" strokeWidth="2.2" strokeDasharray="9 7" />
      <path d="M728 248 L780 248 L780 404" strokeWidth="2" strokeDasharray="8 7" opacity="0.72" />
      <path d="M728 290 L806 290 L806 404" strokeWidth="2" strokeDasharray="8 7" opacity="0.72" />

      <path d="M728 405 L814 405" strokeWidth="2.3" />
      <circle cx="839" cy="405" r="24" strokeWidth="2.3" />
      <rect x="878" y="352" width="48" height="106" rx="16" strokeWidth="2.3" />
      <path d="M863 405 L878 405" strokeWidth="2.3" />
      <path d="M926 405 L944 405 L944 300 L806 300" strokeWidth="2.1" strokeDasharray="8 7" />

      <path d="M120 102 L120 78 L730 78 L730 102" strokeWidth="1.2" opacity="0.55" />
      <path d="M120 88 L730 88" strokeWidth="1.2" opacity="0.55" />
      <path d="M110 80 L130 96 M720 80 L740 96" strokeWidth="1.2" opacity="0.55" />
    </g>

    <g fill="currentColor" fontFamily="JetBrains Mono, monospace" fontSize="12">
      <text x="120" y="62">6.50 m</text>
      <text x="138" y="116">CASCO / CORONAMIENTO</text>
      <text x="180" y="438">SUCCIÓN 63 mm</text>
      <text x="690" y="276">RETORNOS</text>
      <text x="798" y="482">SALA TÉCNICA</text>
      <text x="815" y="368">BOMBA</text>
      <text x="867" y="338">FILTRO</text>
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
            const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 100);
            camera.position.set(9.4, 6.5, 10.8);
            camera.lookAt(0.55, -0.7, 0);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
            renderer.setClearColor(0x000000, 0);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            currentHost.innerHTML = '';
            currentHost.appendChild(renderer.domElement);

            const css = getComputedStyle(document.documentElement);
            const accent = new THREE.Color(css.getPropertyValue('--accent').trim() || '#2f6d72');
            const ink = new THREE.Color(css.getPropertyValue('--ink').trim() || '#2b2f36');
            const soft = new THREE.Color(css.getPropertyValue('--ink-soft').trim() || '#5f6672');
            const good = new THREE.Color(css.getPropertyValue('--good').trim() || '#4f7a52');
            const card = new THREE.Color(css.getPropertyValue('--card').trim() || '#f6f1e6');
            const card2 = new THREE.Color(css.getPropertyValue('--card2').trim() || '#eee7d7');

            const hemi = new THREE.HemisphereLight(card, soft, 2.5);
            scene.add(hemi);
            const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
            keyLight.position.set(7, 10, 8);
            scene.add(keyLight);
            const fillLight = new THREE.DirectionalLight(accent, 1.1);
            fillLight.position.set(-7, 4, -5);
            scene.add(fillLight);

            const installation = new THREE.Group();
            installation.position.set(-0.35, 0.15, 0);
            scene.add(installation);

            const shellMaterial = new THREE.MeshStandardMaterial({
              color: card2,
              roughness: 0.82,
              metalness: 0.02,
              transparent: true,
              opacity: 0.96,
            });
            const copingMaterial = new THREE.MeshStandardMaterial({ color: card, roughness: 0.92, metalness: 0 });
            const equipmentMaterial = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.58, metalness: 0.12 });
            const equipmentSoftMaterial = new THREE.MeshStandardMaterial({ color: soft, roughness: 0.68, metalness: 0.05 });

            const addBox = (
              size: [number, number, number],
              position: [number, number, number],
              material: any,
              edgeColor = ink,
              edgeOpacity = 0.55,
            ) => {
              const geometry = new THREE.BoxGeometry(...size);
              const mesh = new THREE.Mesh(geometry, material);
              mesh.position.set(...position);
              installation.add(mesh);
              const edges = new THREE.LineSegments(
                new THREE.EdgesGeometry(geometry),
                new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: edgeOpacity }),
              );
              edges.position.copy(mesh.position);
              installation.add(edges);
              return mesh;
            };

            // Casco en corte: piso y cuatro paredes para que se vea como piscina,
            // no como una caja cerrada.
            addBox([5.9, 0.16, 3.2], [0, -1.58, 0], shellMaterial, ink, 0.42);
            addBox([5.9, 1.62, 0.16], [0, -0.78, -1.52], shellMaterial, ink, 0.52);
            addBox([5.9, 1.62, 0.16], [0, -0.78, 1.52], shellMaterial, ink, 0.52);
            addBox([0.16, 1.62, 3.2], [-2.87, -0.78, 0], shellMaterial, ink, 0.52);
            addBox([0.16, 1.62, 3.2], [2.87, -0.78, 0], shellMaterial, ink, 0.52);

            // Coronamiento técnico con piezas separadas.
            addBox([6.35, 0.13, 0.34], [0, 0.12, -1.68], copingMaterial, ink, 0.38);
            addBox([6.35, 0.13, 0.34], [0, 0.12, 1.68], copingMaterial, ink, 0.38);
            addBox([0.34, 0.13, 3.05], [-3.02, 0.12, 0], copingMaterial, ink, 0.38);
            addBox([0.34, 0.13, 3.05], [3.02, 0.12, 0], copingMaterial, ink, 0.38);

            // Escalera interior en cabecera derecha.
            addBox([1.25, 0.22, 2.25], [2.22, -1.29, 0], copingMaterial, ink, 0.35);
            addBox([0.92, 0.22, 2.05], [2.38, -0.98, 0], copingMaterial, ink, 0.34);
            addBox([0.62, 0.22, 1.85], [2.53, -0.67, 0], copingMaterial, ink, 0.32);

            // Lámina de agua protagonista.
            const waterGeometry = new THREE.PlaneGeometry(5.55, 2.92, 16, 10);
            const waterMaterial = new THREE.MeshStandardMaterial({
              color: accent,
              transparent: true,
              opacity: 0.48,
              roughness: 0.18,
              metalness: 0.04,
              side: THREE.DoubleSide,
            });
            const water = new THREE.Mesh(waterGeometry, waterMaterial);
            water.rotation.x = -Math.PI / 2;
            water.position.set(-0.1, -0.08, 0);
            installation.add(water);

            // Puntos hidráulicos visibles en el casco.
            const portMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35, metalness: 0.18 });
            const returnMaterial = new THREE.MeshStandardMaterial({ color: good, roughness: 0.35, metalness: 0.18 });
            const addPort = (position: [number, number, number], rotation: [number, number, number], material: any, radius = 0.10) => {
              const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.028, 10, 28), material);
              ring.position.set(...position);
              ring.rotation.set(...rotation);
              installation.add(ring);
            };
            addPort([-2.94, -0.45, 0.72], [0, Math.PI / 2, 0], portMaterial, 0.13);
            addPort([2.94, -0.52, -0.72], [0, Math.PI / 2, 0], returnMaterial, 0.095);
            addPort([2.94, -0.52, 0.72], [0, Math.PI / 2, 0], returnMaterial, 0.095);
            addPort([0.8, -1.49, 0], [Math.PI / 2, 0, 0], portMaterial, 0.11);

            const addPipe = (points: Array<[number, number, number]>, color: any, radius = 0.045, opacity = 0.95) => {
              const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
              const geometry = new THREE.TubeGeometry(curve, 64, radius, 9, false);
              const material = new THREE.MeshStandardMaterial({
                color,
                roughness: 0.48,
                metalness: 0.03,
                transparent: opacity < 1,
                opacity,
              });
              const mesh = new THREE.Mesh(geometry, material);
              installation.add(mesh);
              return mesh;
            };

            // Succión: skimmer + fondo hacia colector y bomba.
            addPipe([
              [-2.92, -0.46, 0.72],
              [-3.55, -0.5, 0.72],
              [-3.55, -2.12, 0.72],
              [2.85, -2.12, 0.72],
              [3.55, -1.92, 0.35],
            ], accent, 0.055);
            addPipe([
              [0.8, -1.48, 0],
              [0.8, -2.12, 0],
              [2.85, -2.12, 0.38],
              [3.55, -1.92, 0.35],
            ], accent, 0.05, 0.78);

            // Impulsión: filtro/bypass a dos retornos.
            addPipe([
              [4.95, -1.55, -0.15],
              [5.25, -1.2, -0.15],
              [5.25, -0.64, -0.7],
              [2.95, -0.54, -0.72],
            ], good, 0.048);
            addPipe([
              [5.25, -0.82, -0.15],
              [5.25, -0.62, 0.7],
              [2.95, -0.54, 0.72],
            ], good, 0.048, 0.86);

            // Sala técnica sobre una pequeña base.
            addBox([2.45, 0.12, 2.0], [4.35, -2.23, 0], copingMaterial, soft, 0.26);

            const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.78, 26), equipmentMaterial);
            pumpBody.rotation.z = Math.PI / 2;
            pumpBody.position.set(3.72, -1.86, 0.34);
            installation.add(pumpBody);
            const pumpMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.55, 22), equipmentSoftMaterial);
            pumpMotor.rotation.z = Math.PI / 2;
            pumpMotor.position.set(3.25, -1.86, 0.34);
            installation.add(pumpMotor);

            const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 1.25, 30), equipmentSoftMaterial);
            filter.position.set(4.72, -1.52, -0.42);
            installation.add(filter);
            const filterTop = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 20), equipmentMaterial);
            filterTop.position.set(4.72, -0.80, -0.42);
            installation.add(filterTop);

            const heater = addBox([0.88, 0.86, 0.66], [4.3, -1.76, 0.72], equipmentSoftMaterial, ink, 0.42);
            heater.rotation.y = -0.08;

            // Bypass visible detrás del filtro.
            addPipe([[4.95, -1.52, -0.1], [5.36, -1.3, 0.3], [5.36, -0.88, 0.3]], good, 0.038, 0.78);
            addPipe([[5.36, -0.88, 0.3], [4.76, -0.88, 0.72], [4.72, -1.34, 0.72]], good, 0.038, 0.78);

            // Cotas simples alrededor de la piscina.
            const lineMaterial = new THREE.LineBasicMaterial({ color: soft, transparent: true, opacity: 0.52 });
            const addDimension = (a: [number, number, number], b: [number, number, number]) => {
              const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
              const line = new THREE.Line(geometry, lineMaterial);
              installation.add(line);
            };
            addDimension([-3.15, 0.55, -1.92], [3.15, 0.55, -1.92]);
            addDimension([-3.15, 0.42, -2.03], [-3.15, 0.68, -1.81]);
            addDimension([3.15, 0.42, -2.03], [3.15, 0.68, -1.81]);
            addDimension([-3.5, 0.32, -1.6], [-3.5, 0.32, 1.6]);

            const grid = new THREE.GridHelper(15, 30, soft, soft);
            const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
            gridMaterials.forEach((material: any) => {
              material.transparent = true;
              material.opacity = 0.11;
            });
            grid.position.y = -2.31;
            installation.add(grid);

            let targetYaw = -0.22;
            let targetPitch = -0.05;
            let frame = 0;
            let pointerInside = false;

            const pointerEnter = () => { pointerInside = true; };
            const pointerLeave = () => {
              pointerInside = false;
              targetYaw = -0.22;
              targetPitch = -0.05;
            };
            const pointerMove = (event: PointerEvent) => {
              if (event.pointerType === 'touch') return;
              const rect = currentHost.getBoundingClientRect();
              const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
              const y = (event.clientY - rect.top) / Math.max(rect.height, 1);
              targetYaw = -0.48 + x * 0.52;
              targetPitch = -0.11 + y * 0.12;
            };
            currentHost.addEventListener('pointerenter', pointerEnter);
            currentHost.addEventListener('pointerleave', pointerLeave);
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
              const now = performance.now();
              const idleYaw = -0.22 + Math.sin(now / 5200) * 0.075;
              installation.rotation.y += ((pointerInside ? targetYaw : idleYaw) - installation.rotation.y) * 0.028;
              installation.rotation.x += (targetPitch - installation.rotation.x) * 0.026;
              installation.position.y = 0.15 + Math.sin(now / 2400) * 0.025;
              water.position.y = -0.08 + Math.sin(now / 1700) * 0.012;
              renderer.render(scene, camera);
              frame = requestAnimationFrame(animate);
            };
            animate();
            setReady(true);

            cleanup = () => {
              cancelAnimationFrame(frame);
              resizeObserver.disconnect();
              currentHost.removeEventListener('pointerenter', pointerEnter);
              currentHost.removeEventListener('pointerleave', pointerLeave);
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
      { rootMargin: '220px' },
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
      <div
        className="pointer-events-none absolute inset-0 opacity-55"
        style={{
          backgroundImage:
            'linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'linear-gradient(180deg, transparent 0%, black 20%, black 80%, transparent 100%)',
        }}
      />
      <div ref={hostRef} className="absolute inset-0" aria-hidden="true" />
      {(!ready || failed) && (
        <div className="absolute inset-0 flex items-center justify-center opacity-80">
          <StaticPoolSketch />
        </div>
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 58% 42%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 36%), linear-gradient(180deg, transparent 68%, color-mix(in srgb, var(--paper) 46%, transparent) 100%)',
        }}
      />
    </div>
  );
};
