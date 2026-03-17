import { describe, it, expect } from 'vitest';
import { integrateStep, vec3Length, vec3Sub, AU } from '../src/physics.ts';
import type { Vec3 } from '../src/types.ts';

describe('Satellite trajectory simulation', () => {
  it('should fall into the Sun when launched with low velocity toward it', () => {
    // Set up a satellite at 1 AU from the Sun (Earth distance)
    // with a velocity directed toward the Sun
    const sunMass = 1.989e30;
    const sunPosition: Vec3 = { x: 0, y: 0, z: 0 };

    const bodies = [{ position: sunPosition, mass: sunMass }];

    // Start at 1 AU on the x-axis
    let position: Vec3 = { x: 1.0, y: 0, z: 0 };

    // Velocity directed toward the Sun (negative x), moderate speed
    // Earth orbital speed is ~29.78 km/s ≈ 29780 m/s ≈ 1.99e-4 AU/s
    // We give it a velocity purely toward the Sun
    let velocity: Vec3 = { x: -10000 / AU, y: 0, z: 0 };

    const dt = 3600; // 1-hour time steps
    const maxSteps = 365 * 24 * 4; // up to 4 years
    const sunRadius = 0.15; // display radius in AU (matching game)

    let hitSun = false;
    let minDistance = Infinity;

    for (let i = 0; i < maxSteps; i++) {
      const result = integrateStep(position, velocity, dt, bodies);
      position = result.position;
      velocity = result.velocity;

      const distFromSun = vec3Length(vec3Sub(position, sunPosition));
      if (distFromSun < minDistance) {
        minDistance = distFromSun;
      }

      if (distFromSun < sunRadius) {
        hitSun = true;
        break;
      }
    }

    // The satellite with very low initial speed and no tangential velocity
    // should be pulled into the Sun (or at least get very close).
    // Since display radius is 0.15 AU which is quite large, it should hit.
    expect(hitSun).toBe(true);
    expect(minDistance).toBeLessThan(sunRadius);
  });

  it('should orbit stably with circular orbit velocity', () => {
    // A satellite at 1 AU with Earth's orbital velocity should stay near 1 AU
    const sunMass = 1.989e30;
    const sunPosition: Vec3 = { x: 0, y: 0, z: 0 };
    const bodies = [{ position: sunPosition, mass: sunMass }];

    let position: Vec3 = { x: 1.0, y: 0, z: 0 };

    // Circular orbit velocity at 1 AU: v = sqrt(GM/r)
    // G = 6.674e-11, M = 1.989e30, r = 1 AU = 1.496e11 m
    // v = sqrt(6.674e-11 * 1.989e30 / 1.496e11) = ~29783 m/s
    const orbitalSpeed = Math.sqrt(6.674e-11 * sunMass / AU);
    let velocity: Vec3 = { x: 0, y: 0, z: orbitalSpeed / AU };

    const dt = 3600;
    const steps = 365 * 24; // 1 year

    let minDist = Infinity;
    let maxDist = 0;

    for (let i = 0; i < steps; i++) {
      const result = integrateStep(position, velocity, dt, bodies);
      position = result.position;
      velocity = result.velocity;

      const dist = vec3Length(vec3Sub(position, sunPosition));
      if (dist < minDist) minDist = dist;
      if (dist > maxDist) maxDist = dist;
    }

    // Should stay roughly at 1 AU (within 5% tolerance)
    expect(minDist).toBeGreaterThan(0.95);
    expect(maxDist).toBeLessThan(1.05);
  });
});
