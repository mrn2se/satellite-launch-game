import type { Vec3 } from './types.ts';

// Gravitational constant in m^3 kg^-1 s^-2
export const G = 6.674e-11;

// 1 AU in meters
export const AU = 1.496e11;

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Calculate gravitational acceleration on a body at positionAU (in AU)
 * due to a mass at sourcePositionAU (in AU) with given mass (kg).
 * Returns acceleration in AU/s^2.
 */
export function gravitationalAcceleration(
  positionAU: Vec3,
  sourcePositionAU: Vec3,
  sourceMassKg: number
): Vec3 {
  const dx = (sourcePositionAU.x - positionAU.x) * AU;
  const dy = (sourcePositionAU.y - positionAU.y) * AU;
  const dz = (sourcePositionAU.z - positionAU.z) * AU;

  const distM = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (distM < 1e3) return { x: 0, y: 0, z: 0 }; // avoid singularity

  const forceMag = G * sourceMassKg / (distM * distM);

  // acceleration direction toward source, in m/s^2
  const ax = forceMag * (dx / distM);
  const ay = forceMag * (dy / distM);
  const az = forceMag * (dz / distM);

  // Convert m/s^2 to AU/s^2
  return { x: ax / AU, y: ay / AU, z: az / AU };
}

/**
 * Compute total gravitational acceleration on a point from multiple bodies.
 */
export function totalGravitationalAcceleration(
  positionAU: Vec3,
  bodies: { position: Vec3; mass: number }[]
): Vec3 {
  let ax = 0, ay = 0, az = 0;
  for (const body of bodies) {
    const a = gravitationalAcceleration(positionAU, body.position, body.mass);
    ax += a.x;
    ay += a.y;
    az += a.z;
  }
  return { x: ax, y: ay, z: az };
}

/**
 * Velocity Verlet integration step.
 * Updates position and velocity in AU and AU/s.
 * dt is in seconds (simulation time).
 */
export function integrateStep(
  position: Vec3,
  velocity: Vec3,
  dt: number,
  bodies: { position: Vec3; mass: number }[]
): { position: Vec3; velocity: Vec3 } {
  // Current acceleration
  const a0 = totalGravitationalAcceleration(position, bodies);

  // Update position: x += v*dt + 0.5*a*dt^2
  const newPosition: Vec3 = {
    x: position.x + velocity.x * dt + 0.5 * a0.x * dt * dt,
    y: position.y + velocity.y * dt + 0.5 * a0.y * dt * dt,
    z: position.z + velocity.z * dt + 0.5 * a0.z * dt * dt,
  };

  // New acceleration at new position
  const a1 = totalGravitationalAcceleration(newPosition, bodies);

  // Update velocity: v += 0.5*(a0+a1)*dt
  const newVelocity: Vec3 = {
    x: velocity.x + 0.5 * (a0.x + a1.x) * dt,
    y: velocity.y + 0.5 * (a0.y + a1.y) * dt,
    z: velocity.z + 0.5 * (a0.z + a1.z) * dt,
  };

  return { position: newPosition, velocity: newVelocity };
}

/**
 * Check if the satellite has collided with any celestial body.
 * Returns the name of the body if collision, null otherwise.
 * Uses displayRadius for game purposes (exaggerated).
 */
export function checkCollision(
  satPositionAU: Vec3,
  bodies: { name: string; position: Vec3; displayRadius: number }[]
): string | null {
  for (const body of bodies) {
    const dist = vec3Length(vec3Sub(satPositionAU, body.position));
    if (dist < body.displayRadius) {
      return body.name;
    }
  }
  return null;
}

/**
 * Compute gravitational field vector at a point (returns acceleration in AU/s^2).
 */
export function gravityFieldAt(
  positionAU: Vec3,
  bodies: { position: Vec3; mass: number }[]
): Vec3 {
  return totalGravitationalAcceleration(positionAU, bodies);
}
