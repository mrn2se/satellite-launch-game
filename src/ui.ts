import type { Simulation } from './simulation.ts';
import type { Renderer } from './renderer.ts';
import { vec3Normalize } from './physics.ts';
import type { Vec3 } from './types.ts';

export class UI {
  private sim: Simulation;
  private renderer: Renderer;
  private statusEl: HTMLElement;
  private timeEl: HTMLElement;
  private speedEl: HTMLElement;
  private messageEl: HTMLElement;

  constructor(
    sim: Simulation,
    renderer: Renderer
  ) {
    this.sim = sim;
    this.renderer = renderer;
    this.statusEl = document.getElementById('status')!;
    this.timeEl = document.getElementById('sim-time')!;
    this.speedEl = document.getElementById('sim-speed')!;
    this.messageEl = document.getElementById('message')!;

    this.setupControls();
    this.setupKeyboard();

    sim.onStateChange = (state, message) => {
      this.statusEl.textContent = state.toUpperCase();
      if (message) {
        this.messageEl.textContent = message;
        this.messageEl.classList.add('visible');
      }
    };
  }

  private setupControls(): void {
    // Launch button
    document.getElementById('btn-launch')!.addEventListener('click', () => {
      const angle = parseFloat((document.getElementById('launch-angle') as HTMLInputElement).value) * Math.PI / 180;
      const speed = parseFloat((document.getElementById('launch-speed') as HTMLInputElement).value);
      this.sim.launch(angle, speed);
      this.renderer.initSatellite();
      this.renderer.setDestinationMarker(this.sim.destinationPlanet);
      document.getElementById('setup-panel')!.style.display = 'none';
      document.getElementById('flight-panel')!.style.display = 'block';
    });

    // Destination selector
    document.getElementById('destination')!.addEventListener('change', (e) => {
      this.sim.setDestination((e.target as HTMLSelectElement).value);
    });

    // Pause/Resume
    document.getElementById('btn-pause')!.addEventListener('click', () => {
      if (this.sim.state === 'running') {
        this.sim.pause();
        document.getElementById('btn-pause')!.textContent = 'Resume';
        document.getElementById('correction-panel')!.style.display = 'block';
      } else if (this.sim.state === 'paused') {
        this.sim.resume();
        document.getElementById('btn-pause')!.textContent = 'Pause';
        document.getElementById('correction-panel')!.style.display = 'none';
      }
    });

    // Time scale slider
    document.getElementById('time-scale')!.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      const scale = Math.pow(10, val);
      this.sim.setTimeScale(scale);
      this.speedEl.textContent = this.formatTimeScale(scale);
    });

    // Gravity field toggle
    document.getElementById('btn-gravity')!.addEventListener('click', () => {
      this.renderer.toggleGravityField(this.sim);
      const btn = document.getElementById('btn-gravity')!;
      btn.classList.toggle('active');
    });

    // Satellite view toggle
    document.getElementById('btn-satview')!.addEventListener('click', () => {
      const btn = document.getElementById('btn-satview')!;
      const isActive = btn.classList.toggle('active');
      this.renderer.setSatelliteView(isActive);
    });

    // Apply correction
    document.getElementById('btn-correct')!.addEventListener('click', () => {
      const dx = parseFloat((document.getElementById('corr-dx') as HTMLInputElement).value);
      const dy = parseFloat((document.getElementById('corr-dy') as HTMLInputElement).value);
      const dz = parseFloat((document.getElementById('corr-dz') as HTMLInputElement).value);
      const dv = parseFloat((document.getElementById('corr-dv') as HTMLInputElement).value);

      const direction: Vec3 = vec3Normalize({ x: dx, y: dy, z: dz });
      this.sim.applyCorrection({ direction, deltaV: dv });
    });

    // Reset
    document.getElementById('btn-reset')!.addEventListener('click', () => {
      this.sim.reset();
      this.renderer.removeGravityFieldVisualization();
      document.getElementById('setup-panel')!.style.display = 'block';
      document.getElementById('flight-panel')!.style.display = 'none';
      document.getElementById('correction-panel')!.style.display = 'none';
      this.messageEl.classList.remove('visible');
      document.getElementById('btn-pause')!.textContent = 'Pause';
    });

    // Focus buttons
    document.querySelectorAll('[data-focus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const planet = (btn as HTMLElement).dataset.focus!;
        this.renderer.focusOnPlanet(planet);
      });
    });
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'p') {
        e.preventDefault();
        document.getElementById('btn-pause')!.click();
      }
      if (e.key === 'g') {
        document.getElementById('btn-gravity')!.click();
      }
      if (e.key === 'v') {
        document.getElementById('btn-satview')!.click();
      }
    });
  }

  update(): void {
    this.timeEl.textContent = `Day ${this.sim.getSimulationDays().toFixed(1)}`;

    if (this.sim.satellite.alive) {
      const vel = this.sim.satellite.velocity;
      const speedAU = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
      const speedKms = speedAU * 1.496e8; // AU/s to km/s
      document.getElementById('sat-speed')!.textContent = `${speedKms.toFixed(1)} km/s`;
    }
  }

  private formatTimeScale(scale: number): string {
    if (scale < 86400) return `${(scale / 3600).toFixed(0)}h/s`;
    if (scale < 86400 * 30) return `${(scale / 86400).toFixed(0)}d/s`;
    return `${(scale / (86400 * 365.25)).toFixed(1)}y/s`;
  }
}
