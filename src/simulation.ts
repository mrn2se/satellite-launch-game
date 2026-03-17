import type { CelestialBody, Satellite, GameState, Vec3, CorrectionManeuver } from './types.ts';
import { integrateStep, checkCollision, vec3Length, vec3Sub, AU } from './physics.ts';
import { createSolarSystem, updateOrbits } from './solarSystem.ts';

export class Simulation {
  bodies: CelestialBody[];
  satellite: Satellite;
  state: GameState = 'setup';
  simulationTime = 0;          // seconds of simulation time elapsed
  timeScale = 86400;            // 1 real second = 1 day by default
  destinationPlanet = 'Mars';
  integrationStep = 3600;       // 1 hour per physics step
  maxTrailLength = 5000;
  onStateChange?: (state: GameState, message?: string) => void;

  constructor() {
    this.bodies = createSolarSystem();
    this.satellite = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      trail: [],
      alive: false,
    };
    this.initPlanetPositions();
  }

  private initPlanetPositions(): void {
    // Set initial orbital positions based on preassigned angles
    for (const body of this.bodies) {
      if (body.orbitRadius === 0) continue;
      body.position.x = Math.cos(body.angle) * body.orbitRadius;
      body.position.z = Math.sin(body.angle) * body.orbitRadius;
      body.position.y = 0;
    }
  }

  setDestination(planetName: string): void {
    this.destinationPlanet = planetName;
  }

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(3600, Math.min(scale, 86400 * 365));
  }

  launch(launchAngle: number, launchSpeed: number): void {
    const earth = this.bodies.find(b => b.name === 'Earth')!;

    // Position satellite just outside Earth's display radius
    const offsetDist = earth.displayRadius + 0.01;
    const launchDir: Vec3 = {
      x: Math.cos(launchAngle),
      y: 0,
      z: Math.sin(launchAngle),
    };

    this.satellite.position = {
      x: earth.position.x + launchDir.x * offsetDist,
      y: earth.position.y,
      z: earth.position.z + launchDir.z * offsetDist,
    };

    // Convert launch speed from km/s to AU/s
    const speedAU = (launchSpeed * 1000) / AU;

    // Add Earth's orbital velocity (tangential)
    const earthTangent: Vec3 = {
      x: -Math.sin(earth.angle),
      y: 0,
      z: Math.cos(earth.angle),
    };
    const earthOrbitalSpeed = earth.orbitSpeed * earth.orbitRadius; // AU/s

    this.satellite.velocity = {
      x: launchDir.x * speedAU + earthTangent.x * earthOrbitalSpeed,
      y: 0,
      z: launchDir.z * speedAU + earthTangent.z * earthOrbitalSpeed,
    };

    this.satellite.trail = [{ ...this.satellite.position }];
    this.satellite.alive = true;
    this.state = 'running';
    this.simulationTime = 0;
    this.onStateChange?.('running');
  }

  pause(): void {
    if (this.state === 'running') {
      this.state = 'paused';
      this.onStateChange?.('paused');
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'running';
      this.onStateChange?.('running');
    }
  }

  applyCorrection(maneuver: CorrectionManeuver): void {
    // Convert deltaV from m/s to AU/s and apply
    const dvAU = maneuver.deltaV / AU;
    this.satellite.velocity.x += maneuver.direction.x * dvAU;
    this.satellite.velocity.y += maneuver.direction.y * dvAU;
    this.satellite.velocity.z += maneuver.direction.z * dvAU;
  }

  /**
   * Advance simulation by realDt seconds of real time.
   * Uses sub-stepping for physics accuracy.
   */
  update(realDt: number): void {
    if (this.state !== 'running' || !this.satellite.alive) return;

    const simDt = realDt * this.timeScale;
    let remaining = simDt;

    while (remaining > 0) {
      const step = Math.min(remaining, this.integrationStep);
      remaining -= step;

      // Update planet orbits
      updateOrbits(this.bodies, step);

      // Integrate satellite
      const bodyData = this.bodies.map(b => ({ position: { ...b.position }, mass: b.mass }));
      const result = integrateStep(this.satellite.position, this.satellite.velocity, step, bodyData);
      this.satellite.position = result.position;
      this.satellite.velocity = result.velocity;

      // Record trail
      this.satellite.trail.push({ ...this.satellite.position });
      if (this.satellite.trail.length > this.maxTrailLength) {
        this.satellite.trail.shift();
      }

      // Check collision
      const collisionBody = checkCollision(this.satellite.position, this.bodies);
      if (collisionBody) {
        this.satellite.alive = false;
        if (collisionBody === this.destinationPlanet) {
          this.state = 'won';
          this.onStateChange?.('won', `Satellite reached ${collisionBody}!`);
        } else {
          this.state = 'lost';
          this.onStateChange?.('lost', `Satellite crashed into ${collisionBody}!`);
        }
        return;
      }

      // Check if satellite is too far away (lost in space)
      const distFromSun = vec3Length(vec3Sub(this.satellite.position, this.bodies[0].position));
      if (distFromSun > 100) {
        this.satellite.alive = false;
        this.state = 'lost';
        this.onStateChange?.('lost', 'Satellite lost in deep space!');
        return;
      }

      this.simulationTime += step;
    }
  }

  getSimulationDays(): number {
    return this.simulationTime / 86400;
  }

  reset(): void {
    this.bodies = createSolarSystem();
    this.initPlanetPositions();
    this.satellite = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      trail: [],
      alive: false,
    };
    this.state = 'setup';
    this.simulationTime = 0;
    this.onStateChange?.('setup');
  }
}
