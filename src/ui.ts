import type { Simulation } from './simulation.ts';
import type { Renderer } from './renderer.ts';
import { vec3Normalize } from './physics.ts';
import type { Vec3 } from './types.ts';
import { GamepadManager } from './gamepad.ts';

export class UI {
  private sim: Simulation;
  private renderer: Renderer;
  private statusEl: HTMLElement;
  private timeEl: HTMLElement;
  private speedEl: HTMLElement;
  private messageEl: HTMLElement;
  private gamepad: GamepadManager;

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
    this.setupMobile();
    this.setupCorrectionJoystick();

    this.gamepad = new GamepadManager(
      sim, renderer,
      () => this.togglePause(),
      () => this.applyCorrection(),
      () => document.getElementById('btn-gravity')!.click(),
      () => document.getElementById('btn-satview')!.click(),
      () => this.doLaunch(),
      () => this.doReset()
    );

    sim.onStateChange = (state, message) => {
      this.statusEl.textContent = state.toUpperCase();
      if (message) {
        this.messageEl.textContent = message;
        this.messageEl.classList.add('visible');
      }
    };
  }

  private doLaunch(): void {
    const angle = parseFloat((document.getElementById('launch-angle') as HTMLInputElement).value) * Math.PI / 180;
    const speed = parseFloat((document.getElementById('launch-speed') as HTMLInputElement).value);
    this.sim.launch(angle, speed);
    this.renderer.initSatellite();
    this.renderer.setDestinationMarker(this.sim.destinationPlanet);
    document.getElementById('setup-panel')!.style.display = 'none';
    document.getElementById('flight-panel')!.style.display = 'block';
  }

  private togglePause(): void {
    if (this.sim.state === 'running') {
      this.sim.pause();
      document.getElementById('btn-pause')!.textContent = 'Resume';
      document.getElementById('correction-panel')!.style.display = 'block';
      this.renderer.showCorrectionArrow(this.sim);
    } else if (this.sim.state === 'paused') {
      this.sim.resume();
      document.getElementById('btn-pause')!.textContent = 'Pause';
      document.getElementById('correction-panel')!.style.display = 'none';
      this.renderer.removeCorrectionArrow();
    }
  }

  private applyCorrection(): void {
    const dx = parseFloat((document.getElementById('corr-dx') as HTMLInputElement).value);
    const dy = parseFloat((document.getElementById('corr-dy') as HTMLInputElement).value);
    const dz = parseFloat((document.getElementById('corr-dz') as HTMLInputElement).value);
    const dv = parseFloat((document.getElementById('corr-dv') as HTMLInputElement).value);

    const direction: Vec3 = vec3Normalize({ x: dx, y: dy, z: dz });
    this.sim.applyCorrection({ direction, deltaV: dv });
  }

  private doReset(): void {
    this.sim.reset();
    this.renderer.removeGravityFieldVisualization();
    this.renderer.removeCorrectionArrow();
    document.getElementById('setup-panel')!.style.display = 'block';
    document.getElementById('flight-panel')!.style.display = 'none';
    document.getElementById('correction-panel')!.style.display = 'none';
    this.messageEl.classList.remove('visible');
    document.getElementById('btn-pause')!.textContent = 'Pause';
  }

  private setupControls(): void {
    // Launch button
    document.getElementById('btn-launch')!.addEventListener('click', () => this.doLaunch());

    // Destination selector
    document.getElementById('destination')!.addEventListener('change', (e) => {
      this.sim.setDestination((e.target as HTMLSelectElement).value);
    });

    // Pause/Resume
    document.getElementById('btn-pause')!.addEventListener('click', () => this.togglePause());

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
      document.getElementById('btn-gravity')!.classList.toggle('active');
    });

    // Satellite view toggle
    document.getElementById('btn-satview')!.addEventListener('click', () => {
      const btn = document.getElementById('btn-satview')!;
      const isActive = btn.classList.toggle('active');
      this.renderer.setSatelliteView(isActive);
    });

    // Apply correction
    document.getElementById('btn-correct')!.addEventListener('click', () => this.applyCorrection());

    // Correction input fields update 3D arrow
    for (const id of ['corr-dx', 'corr-dy', 'corr-dz']) {
      document.getElementById(id)!.addEventListener('input', () => {
        const dx = parseFloat((document.getElementById('corr-dx') as HTMLInputElement).value) || 0;
        const dy = parseFloat((document.getElementById('corr-dy') as HTMLInputElement).value) || 0;
        const dz = parseFloat((document.getElementById('corr-dz') as HTMLInputElement).value) || 0;
        this.renderer.correctionAngleH = Math.atan2(dz, dx);
        this.renderer.correctionAngleV = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
        this.renderer.updateCorrectionDirection();
      });
    }
    document.getElementById('corr-dv')!.addEventListener('input', () => {
      this.renderer.correctionDeltaV = parseFloat((document.getElementById('corr-dv') as HTMLInputElement).value) || 0;
      this.renderer.updateCorrectionDirection();
    });

    // Reset
    document.getElementById('btn-reset')!.addEventListener('click', () => this.doReset());

    // Focus buttons
    document.querySelectorAll('[data-focus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const planet = (btn as HTMLElement).dataset.focus!;
        this.renderer.focusOnPlanet(planet);
      });
    });

    // Mobile panel toggle
    document.getElementById('btn-toggle-panel')?.addEventListener('click', () => {
      document.getElementById('ui-panel')!.classList.toggle('collapsed');
    });

    // Mobile quick buttons
    document.getElementById('mob-pause')?.addEventListener('click', () => this.togglePause());
    document.getElementById('mob-gravity')?.addEventListener('click', () => {
      document.getElementById('btn-gravity')!.click();
    });
    document.getElementById('mob-satview')?.addEventListener('click', () => {
      document.getElementById('btn-satview')!.click();
    });

    // Delta-V slider ↔ input sync
    const dvSlider = document.getElementById('corr-dv-slider') as HTMLInputElement | null;
    const dvInput = document.getElementById('corr-dv') as HTMLInputElement;
    if (dvSlider) {
      dvSlider.addEventListener('input', () => {
        dvInput.value = dvSlider.value;
        this.renderer.correctionDeltaV = parseFloat(dvSlider.value);
        this.renderer.updateCorrectionDirection();
      });
      dvInput.addEventListener('input', () => {
        dvSlider.value = dvInput.value;
      });
    }
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'p') {
        e.preventDefault();
        this.togglePause();
      }
      if (e.key === 'g') {
        document.getElementById('btn-gravity')!.click();
      }
      if (e.key === 'v') {
        document.getElementById('btn-satview')!.click();
      }

      // Arrow keys adjust correction when paused
      if (this.sim.state === 'paused' && this.sim.satellite.alive) {
        const step = 0.1;
        if (e.key === 'ArrowLeft') { this.renderer.correctionAngleH -= step; this.syncArrowToInputs(); }
        if (e.key === 'ArrowRight') { this.renderer.correctionAngleH += step; this.syncArrowToInputs(); }
        if (e.key === 'ArrowUp') {
          this.renderer.correctionAngleV = Math.min(Math.PI / 2, this.renderer.correctionAngleV + step);
          this.syncArrowToInputs();
        }
        if (e.key === 'ArrowDown') {
          this.renderer.correctionAngleV = Math.max(-Math.PI / 2, this.renderer.correctionAngleV - step);
          this.syncArrowToInputs();
        }
      }
    });
  }

  private syncArrowToInputs(): void {
    const dir = this.renderer.getCorrectionDirection();
    (document.getElementById('corr-dx') as HTMLInputElement).value = dir.x.toFixed(2);
    (document.getElementById('corr-dy') as HTMLInputElement).value = dir.y.toFixed(2);
    (document.getElementById('corr-dz') as HTMLInputElement).value = dir.z.toFixed(2);
    this.renderer.updateCorrectionDirection();
  }

  private setupMobile(): void {
    // Prevent default touch behaviors that interfere with the game
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    // Show mobile-specific controls
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('is-touch');
    }
  }

  private setupCorrectionJoystick(): void {
    const joystick = document.getElementById('correction-joystick');
    const knob = document.getElementById('joystick-knob');
    if (!joystick || !knob) return;

    let dragging = false;
    let jRect: DOMRect;

    const startDrag = (clientX: number, clientY: number) => {
      dragging = true;
      jRect = joystick.getBoundingClientRect();
      moveDrag(clientX, clientY);
    };

    const moveDrag = (clientX: number, clientY: number) => {
      if (!dragging) return;
      const cx = jRect.left + jRect.width / 2;
      const cy = jRect.top + jRect.height / 2;
      let dx = (clientX - cx) / (jRect.width / 2);
      let dy = (clientY - cy) / (jRect.height / 2);

      // Clamp to circle
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) { dx /= dist; dy /= dist; }

      knob.style.transform = `translate(${dx * 35}px, ${dy * 35}px)`;

      // Map to correction angles
      this.renderer.correctionAngleH = dx * Math.PI;
      this.renderer.correctionAngleV = -dy * Math.PI / 2;
      this.renderer.updateCorrectionDirection();
      this.syncArrowToInputs();
    };

    const endDrag = () => { dragging = false; };

    // Mouse
    joystick.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);

    // Touch
    joystick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
    }, { passive: false });
    window.addEventListener('touchmove', (e) => {
      if (!dragging) return;
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    });
    window.addEventListener('touchend', endDrag);
  }

  update(): void {
    this.timeEl.textContent = `Day ${this.sim.getSimulationDays().toFixed(1)}`;

    if (this.sim.satellite.alive) {
      const vel = this.sim.satellite.velocity;
      const speedAU = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
      const speedKms = speedAU * 1.496e8; // AU/s to km/s
      document.getElementById('sat-speed')!.textContent = `${speedKms.toFixed(1)} km/s`;
    }

    // Update 3D correction arrow position
    this.renderer.updateCorrectionArrowPosition(this.sim);

    // Poll gamepad
    this.gamepad.update();
  }

  private formatTimeScale(scale: number): string {
    if (scale < 86400) return `${(scale / 3600).toFixed(0)}h/s`;
    if (scale < 86400 * 30) return `${(scale / 86400).toFixed(0)}d/s`;
    return `${(scale / (86400 * 365.25)).toFixed(1)}y/s`;
  }
}
