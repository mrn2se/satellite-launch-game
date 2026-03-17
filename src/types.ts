export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface CelestialBody {
  name: string;
  mass: number;           // kg
  radius: number;         // meters (real)
  displayRadius: number;  // AU (exaggerated for display)
  orbitRadius: number;    // AU (semi-major axis)
  orbitSpeed: number;     // radians per second (real orbital angular velocity)
  color: number;
  emissive?: number;
  position: Vec3;         // current position in AU
  angle: number;          // current orbital angle
}

export interface Satellite {
  position: Vec3;   // AU
  velocity: Vec3;   // AU/s
  trail: Vec3[];
  alive: boolean;
}

export interface CorrectionManeuver {
  direction: Vec3;  // unit vector
  deltaV: number;   // m/s
}

export type GameState = 'setup' | 'running' | 'paused' | 'won' | 'lost';
