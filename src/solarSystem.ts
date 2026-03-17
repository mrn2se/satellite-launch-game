import type { CelestialBody } from './types.ts';

/**
 * Solar system data with real masses and orbital radii.
 * Display radii are exaggerated for visibility.
 * Orbit radii in AU, masses in kg.
 */
export function createSolarSystem(): CelestialBody[] {
  return [
    {
      name: 'Sun',
      mass: 1.989e30,
      radius: 6.957e8,
      displayRadius: 0.15,
      orbitRadius: 0,
      orbitSpeed: 0,
      color: 0xffdd00,
      emissive: 0xffaa00,
      position: { x: 0, y: 0, z: 0 },
      angle: 0,
    },
    {
      name: 'Mercury',
      mass: 3.301e23,
      radius: 2.4397e6,
      displayRadius: 0.03,
      orbitRadius: 0.387,
      orbitSpeed: 2 * Math.PI / (87.97 * 86400),
      color: 0xaaaaaa,
      position: { x: 0.387, y: 0, z: 0 },
      angle: 0,
    },
    {
      name: 'Venus',
      mass: 4.867e24,
      radius: 6.0518e6,
      displayRadius: 0.045,
      orbitRadius: 0.723,
      orbitSpeed: 2 * Math.PI / (224.7 * 86400),
      color: 0xe8cda0,
      position: { x: 0.723, y: 0, z: 0 },
      angle: Math.PI * 0.4,
    },
    {
      name: 'Earth',
      mass: 5.972e24,
      radius: 6.371e6,
      displayRadius: 0.05,
      orbitRadius: 1.0,
      orbitSpeed: 2 * Math.PI / (365.25 * 86400),
      color: 0x4488ff,
      position: { x: 1.0, y: 0, z: 0 },
      angle: Math.PI * 0.8,
    },
    {
      name: 'Mars',
      mass: 6.417e23,
      radius: 3.3895e6,
      displayRadius: 0.04,
      orbitRadius: 1.524,
      orbitSpeed: 2 * Math.PI / (687.0 * 86400),
      color: 0xdd4422,
      position: { x: 1.524, y: 0, z: 0 },
      angle: Math.PI * 1.2,
    },
    {
      name: 'Jupiter',
      mass: 1.898e27,
      radius: 6.9911e7,
      displayRadius: 0.1,
      orbitRadius: 5.203,
      orbitSpeed: 2 * Math.PI / (4332.59 * 86400),
      color: 0xddaa77,
      position: { x: 5.203, y: 0, z: 0 },
      angle: Math.PI * 1.6,
    },
    {
      name: 'Saturn',
      mass: 5.683e26,
      radius: 5.8232e7,
      displayRadius: 0.085,
      orbitRadius: 9.537,
      orbitSpeed: 2 * Math.PI / (10759.22 * 86400),
      color: 0xeecc88,
      position: { x: 9.537, y: 0, z: 0 },
      angle: Math.PI * 0.2,
    },
    {
      name: 'Uranus',
      mass: 8.681e25,
      radius: 2.5362e7,
      displayRadius: 0.065,
      orbitRadius: 19.19,
      orbitSpeed: 2 * Math.PI / (30688.5 * 86400),
      color: 0x88ccee,
      position: { x: 19.19, y: 0, z: 0 },
      angle: Math.PI * 1.0,
    },
    {
      name: 'Neptune',
      mass: 1.024e26,
      radius: 2.4622e7,
      displayRadius: 0.06,
      orbitRadius: 30.07,
      orbitSpeed: 2 * Math.PI / (60182.0 * 86400),
      color: 0x4466ff,
      position: { x: 30.07, y: 0, z: 0 },
      angle: Math.PI * 1.5,
    },
  ];
}

/**
 * Update orbital positions of all planets.
 * dt in simulation seconds.
 */
export function updateOrbits(bodies: CelestialBody[], dt: number): void {
  for (const body of bodies) {
    if (body.orbitRadius === 0) continue; // Sun stays fixed
    body.angle += body.orbitSpeed * dt;
    body.position.x = Math.cos(body.angle) * body.orbitRadius;
    body.position.z = Math.sin(body.angle) * body.orbitRadius;
    body.position.y = 0;
  }
}
