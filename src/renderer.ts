import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Simulation } from './simulation.ts';
import type { CelestialBody } from './types.ts';
import { totalGravitationalAcceleration } from './physics.ts';

export class Renderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  orbitCamera: THREE.PerspectiveCamera;
  satelliteCamera: THREE.PerspectiveCamera;
  activeCamera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;

  planetMeshes: Map<string, THREE.Mesh> = new Map();
  orbitLines: Map<string, THREE.Line> = new Map();
  satelliteMesh: THREE.Mesh | null = null;
  trailLine: THREE.Line | null = null;
  trailGeometry: THREE.BufferGeometry | null = null;

  destinationMarker: THREE.Mesh | null = null;

  gravityArrows: THREE.Group | null = null;
  showGravityField = false;

  // 3D correction arrow (shown when paused)
  correctionArrow: THREE.ArrowHelper | null = null;
  correctionGroup: THREE.Group | null = null;
  correctionAngleH = 0;  // horizontal angle (radians)
  correctionAngleV = 0;  // vertical angle (radians)
  correctionDeltaV = 500; // m/s

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);

    // Main orbit camera
    this.orbitCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.001, 200);
    this.orbitCamera.position.set(0, 8, 8);

    // Satellite camera
    this.satelliteCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 200);

    this.activeCamera = this.orbitCamera;
    this.camera = this.orbitCamera;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.orbitCamera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 80;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x333344, 0.5);
    this.scene.add(ambientLight);

    const sunLight = new THREE.PointLight(0xffffff, 2, 100);
    sunLight.position.set(0, 0, 0);
    this.scene.add(sunLight);

    // Stars background
    this.createStarField();

    window.addEventListener('resize', () => this.onResize());
  }

  private createStarField(): void {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices: number[] = [];
    for (let i = 0; i < 5000; i++) {
      const r = 80 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starVertices.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
    }
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    this.scene.add(new THREE.Points(starGeometry, starMaterial));
  }

  initSolarSystem(bodies: CelestialBody[]): void {
    for (const body of bodies) {
      // Planet sphere
      const geometry = new THREE.SphereGeometry(body.displayRadius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: body.color,
        emissive: body.emissive ?? 0x000000,
        emissiveIntensity: body.emissive ? 1.0 : 0,
        roughness: 0.8,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(body.position.x, body.position.y, body.position.z);
      this.scene.add(mesh);
      this.planetMeshes.set(body.name, mesh);

      // Orbit ring
      if (body.orbitRadius > 0) {
        const orbitGeometry = new THREE.BufferGeometry();
        const orbitPoints: number[] = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          orbitPoints.push(
            Math.cos(angle) * body.orbitRadius,
            0,
            Math.sin(angle) * body.orbitRadius
          );
        }
        orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(orbitPoints, 3));
        const orbitMaterial = new THREE.LineBasicMaterial({ color: 0x333355, transparent: true, opacity: 0.4 });
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        this.scene.add(orbitLine);
        this.orbitLines.set(body.name, orbitLine);
      }

      // Planet label
      this.createLabel(body.name, mesh);
    }
  }

  private createLabel(text: string, parent: THREE.Mesh): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.8 });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.4, 0.1, 1);
    const parentGeo = parent.geometry as THREE.SphereGeometry;
    sprite.position.y = parentGeo.parameters.radius + 0.06;
    parent.add(sprite);
  }

  initSatellite(): void {
    const geometry = new THREE.ConeGeometry(0.012, 0.04, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0.5 });
    this.satelliteMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.satelliteMesh);

    // Trail
    this.trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.6 });
    this.trailLine = new THREE.Line(this.trailGeometry, trailMaterial);
    this.scene.add(this.trailLine);
  }

  setDestinationMarker(planetName: string): void {
    if (this.destinationMarker) {
      this.scene.remove(this.destinationMarker);
    }
    const mesh = this.planetMeshes.get(planetName);
    if (!mesh) return;

    const ringGeo = new THREE.RingGeometry(0.08, 0.1, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4444, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    this.destinationMarker = new THREE.Mesh(ringGeo, ringMat);
    this.destinationMarker.rotation.x = -Math.PI / 2;
    mesh.add(this.destinationMarker);
  }

  updateScene(sim: Simulation): void {
    // Update planet positions
    for (const body of sim.bodies) {
      const mesh = this.planetMeshes.get(body.name);
      if (mesh) {
        mesh.position.set(body.position.x, body.position.y, body.position.z);
      }
    }

    // Update satellite
    if (sim.satellite.alive && this.satelliteMesh) {
      const pos = sim.satellite.position;
      this.satelliteMesh.position.set(pos.x, pos.y, pos.z);
      this.satelliteMesh.visible = true;

      // Update trail
      if (this.trailGeometry && sim.satellite.trail.length > 1) {
        const positions = new Float32Array(sim.satellite.trail.length * 3);
        for (let i = 0; i < sim.satellite.trail.length; i++) {
          positions[i * 3] = sim.satellite.trail[i].x;
          positions[i * 3 + 1] = sim.satellite.trail[i].y;
          positions[i * 3 + 2] = sim.satellite.trail[i].z;
        }
        this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.trailGeometry.computeBoundingSphere();
      }

      // Satellite camera follows satellite
      const vel = sim.satellite.velocity;
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
      if (speed > 0) {
        const lookDir = new THREE.Vector3(vel.x / speed, vel.y / speed, vel.z / speed);
        this.satelliteCamera.position.set(
          pos.x - lookDir.x * 0.1,
          pos.y + 0.05,
          pos.z - lookDir.z * 0.1
        );
        this.satelliteCamera.lookAt(pos.x + lookDir.x, pos.y, pos.z + lookDir.z);
      }
    } else if (this.satelliteMesh) {
      this.satelliteMesh.visible = false;
    }

    // Update gravity field visualization if enabled
    if (this.showGravityField) {
      this.createGravityFieldVisualization(sim);
    }

    // Update controls and render
    if (this.activeCamera === this.orbitCamera) {
      this.controls.update();
    }
    this.renderer.render(this.scene, this.activeCamera);
  }

  setSatelliteView(enabled: boolean): void {
    this.activeCamera = enabled ? this.satelliteCamera : this.orbitCamera;
    this.controls.enabled = !enabled;
  }

  toggleGravityField(sim: Simulation): void {
    this.showGravityField = !this.showGravityField;
    if (this.showGravityField) {
      this.createGravityFieldVisualization(sim);
    } else {
      this.removeGravityFieldVisualization();
    }
  }

  createGravityFieldVisualization(sim: Simulation): void {
    this.removeGravityFieldVisualization();
    this.gravityArrows = new THREE.Group();

    const bodyData = sim.bodies.map(b => ({ position: { ...b.position }, mass: b.mass }));

    // 1) Global grid arrows on the XZ plane
    const range = 12;
    const step = 0.8;

    for (let x = -range; x <= range; x += step) {
      for (let z = -range; z <= range; z += step) {
        const pos = { x, y: 0, z };

        let insidePlanet = false;
        for (const body of sim.bodies) {
          const dx = x - body.position.x;
          const dz = z - body.position.z;
          if (Math.sqrt(dx * dx + dz * dz) < body.displayRadius * 1.5) {
            insidePlanet = true;
            break;
          }
        }
        if (insidePlanet) continue;

        const accel = totalGravitationalAcceleration(pos, bodyData);
        const mag = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
        if (mag < 1e-30) continue;

        const arrowLength = Math.min(0.3, Math.log10(mag / 1e-25) * 0.05 + 0.15);
        if (arrowLength < 0.02) continue;

        const dir = new THREE.Vector3(accel.x / mag, 0, accel.z / mag);
        const origin = new THREE.Vector3(x, 0, z);

        const t = Math.min(1, Math.max(0, (Math.log10(mag) + 25) / 10));
        const color = new THREE.Color().setHSL(0.66 - t * 0.66, 1, 0.5);

        const arrowHelper = new THREE.ArrowHelper(dir, origin, arrowLength, color.getHex(), 0.06, 0.04);
        this.gravityArrows.add(arrowHelper);
      }
    }

    // 2) Dense arrows around each planet in concentric rings
    for (const body of sim.bodies) {
      const rings = [1.5, 2.2, 3.0];
      const arrowCountBase = body.name === 'Sun' ? 24 : 16;

      for (const ringMult of rings) {
        const ringRadius = body.displayRadius * ringMult;
        const arrowCount = arrowCountBase;

        for (let i = 0; i < arrowCount; i++) {
          const angle = (i / arrowCount) * Math.PI * 2;
          const px = body.position.x + Math.cos(angle) * ringRadius;
          const pz = body.position.z + Math.sin(angle) * ringRadius;
          const pos = { x: px, y: 0, z: pz };

          const accel = totalGravitationalAcceleration(pos, bodyData);
          const mag = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
          if (mag < 1e-30) continue;

          const arrowLen = Math.min(ringRadius * 0.35, Math.log10(mag / 1e-25) * 0.04 + 0.1);
          if (arrowLen < 0.01) continue;

          const dir = new THREE.Vector3(accel.x / mag, 0, accel.z / mag);
          const origin = new THREE.Vector3(px, 0, pz);

          const t = Math.min(1, Math.max(0, (Math.log10(mag) + 25) / 10));
          const color = new THREE.Color().setHSL(0.66 - t * 0.66, 1, 0.5);

          const headLen = Math.min(arrowLen * 0.3, 0.04);
          const headW = Math.min(arrowLen * 0.2, 0.03);
          const ah = new THREE.ArrowHelper(dir, origin, arrowLen, color.getHex(), headLen, headW);
          this.gravityArrows.add(ah);
        }
      }

      // 3) Vertical arrows above/below each planet
      for (const yOff of [-1, 1]) {
        for (const ringMult of [1.5, 2.5]) {
          const ringRadius = body.displayRadius * ringMult;
          const vertCount = body.name === 'Sun' ? 12 : 8;
          for (let i = 0; i < vertCount; i++) {
            const angle = (i / vertCount) * Math.PI * 2;
            const px = body.position.x + Math.cos(angle) * ringRadius;
            const py = yOff * body.displayRadius * 1.2;
            const pz = body.position.z + Math.sin(angle) * ringRadius;
            const pos = { x: px, y: py, z: pz };

            const accel = totalGravitationalAcceleration(pos, bodyData);
            const mag = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
            if (mag < 1e-30) continue;

            const arrowLen = Math.min(ringRadius * 0.3, 0.15);
            if (arrowLen < 0.01) continue;

            const dir = new THREE.Vector3(accel.x / mag, accel.y / mag, accel.z / mag);
            const origin = new THREE.Vector3(px, py, pz);

            const t = Math.min(1, Math.max(0, (Math.log10(mag) + 25) / 10));
            const color = new THREE.Color().setHSL(0.66 - t * 0.66, 1, 0.5);

            const ah = new THREE.ArrowHelper(dir, origin, arrowLen, color.getHex(), arrowLen * 0.3, arrowLen * 0.2);
            this.gravityArrows.add(ah);
          }
        }
      }
    }

    this.scene.add(this.gravityArrows);
  }

  removeGravityFieldVisualization(): void {
    if (this.gravityArrows) {
      this.scene.remove(this.gravityArrows);
      this.gravityArrows = null;
    }
  }

  focusOnPlanet(name: string): void {
    const mesh = this.planetMeshes.get(name);
    if (mesh) {
      this.controls.target.copy(mesh.position);
    }
  }

  // --- 3D Correction Arrow ---

  showCorrectionArrow(sim: Simulation): void {
    this.removeCorrectionArrow();
    if (!sim.satellite.alive) return;

    this.correctionGroup = new THREE.Group();
    const pos = sim.satellite.position;
    this.correctionGroup.position.set(pos.x, pos.y, pos.z);

    // Reference axes (small, semi-transparent)
    const axLen = 0.12;
    const xAxis = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), axLen, 0xff4444, 0.02, 0.015);
    const yAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), axLen, 0x44ff44, 0.02, 0.015);
    const zAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), axLen, 0x4444ff, 0.02, 0.015);
    this.correctionGroup.add(xAxis, yAxis, zAxis);

    // Correction direction arrow
    this.updateCorrectionDirection();

    this.scene.add(this.correctionGroup);
  }

  updateCorrectionDirection(): void {
    if (!this.correctionGroup) return;

    // Remove old arrow
    if (this.correctionArrow) {
      this.correctionGroup.remove(this.correctionArrow);
    }

    const dir = new THREE.Vector3(
      Math.cos(this.correctionAngleV) * Math.cos(this.correctionAngleH),
      Math.sin(this.correctionAngleV),
      Math.cos(this.correctionAngleV) * Math.sin(this.correctionAngleH)
    ).normalize();

    const arrowLen = 0.05 + (this.correctionDeltaV / 10000) * 0.2;
    this.correctionArrow = new THREE.ArrowHelper(dir, new THREE.Vector3(), arrowLen, 0xff8800, arrowLen * 0.3, arrowLen * 0.2);
    this.correctionGroup.add(this.correctionArrow);
  }

  removeCorrectionArrow(): void {
    if (this.correctionGroup) {
      this.scene.remove(this.correctionGroup);
      this.correctionGroup = null;
      this.correctionArrow = null;
    }
  }

  getCorrectionDirection(): { x: number; y: number; z: number } {
    return {
      x: Math.cos(this.correctionAngleV) * Math.cos(this.correctionAngleH),
      y: Math.sin(this.correctionAngleV),
      z: Math.cos(this.correctionAngleV) * Math.sin(this.correctionAngleH),
    };
  }

  updateCorrectionArrowPosition(sim: Simulation): void {
    if (this.correctionGroup && sim.satellite.alive) {
      const pos = sim.satellite.position;
      this.correctionGroup.position.set(pos.x, pos.y, pos.z);
    }
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.orbitCamera.aspect = w / h;
    this.orbitCamera.updateProjectionMatrix();
    this.satelliteCamera.aspect = w / h;
    this.satelliteCamera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
