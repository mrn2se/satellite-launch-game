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
  private correctionPlane: HTMLCanvasElement | null;
  private correctionPlaneContext: CanvasRenderingContext2D | null;
  private elevationValueEl: HTMLElement;

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
    this.correctionPlane = document.getElementById('correction-plane') as HTMLCanvasElement | null;
    this.correctionPlaneContext = this.correctionPlane?.getContext('2d') ?? null;
    this.elevationValueEl = document.getElementById('corr-elevation-value')!;

    this.setupControls();
    this.setupKeyboard();
    this.setupMobile();
    this.setupCorrectionPlane();

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
      this.syncCorrectionUi();
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
    this.syncCorrectionUi();
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
        this.updateCorrectionFromInputs();
      });
    }
    document.getElementById('corr-dv')!.addEventListener('input', () => {
      this.renderer.correctionDeltaV = parseFloat((document.getElementById('corr-dv') as HTMLInputElement).value) || 0;
      this.renderer.updateCorrectionDirection();
      this.renderCorrectionPlane();
    });

    document.getElementById('corr-elevation')!.addEventListener('input', (event) => {
      const degrees = parseFloat((event.target as HTMLInputElement).value) || 0;
      this.renderer.correctionAngleV = (degrees * Math.PI) / 180;
      this.syncCorrectionUi();
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
        this.renderCorrectionPlane();
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
    this.renderCorrectionPlane();
  }

  private updateCorrectionFromInputs(): void {
    const dx = parseFloat((document.getElementById('corr-dx') as HTMLInputElement).value) || 0;
    const dy = parseFloat((document.getElementById('corr-dy') as HTMLInputElement).value) || 0;
    const dz = parseFloat((document.getElementById('corr-dz') as HTMLInputElement).value) || 0;
    this.renderer.correctionAngleH = Math.atan2(dz, dx);
    this.renderer.correctionAngleV = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
    this.syncCorrectionUi();
  }

  private syncCorrectionUi(): void {
    const dir = this.renderer.getCorrectionDirection();
    (document.getElementById('corr-dx') as HTMLInputElement).value = dir.x.toFixed(2);
    (document.getElementById('corr-dy') as HTMLInputElement).value = dir.y.toFixed(2);
    (document.getElementById('corr-dz') as HTMLInputElement).value = dir.z.toFixed(2);
    (document.getElementById('corr-dv') as HTMLInputElement).value = this.renderer.correctionDeltaV.toFixed(0);
    const dvSlider = document.getElementById('corr-dv-slider') as HTMLInputElement | null;
    if (dvSlider) {
      dvSlider.value = this.renderer.correctionDeltaV.toFixed(0);
    }

    const elevationDegrees = Math.round((this.renderer.correctionAngleV * 180) / Math.PI);
    (document.getElementById('corr-elevation') as HTMLInputElement).value = elevationDegrees.toString();
    this.elevationValueEl.textContent = `${elevationDegrees}°`;
    this.renderer.updateCorrectionDirection();
    this.renderCorrectionPlane();
  }

  private setupMobile(): void {
    // Prevent default touch behaviors that interfere with the game
    document.addEventListener('gesturestart', (e) => e.preventDefault());

    // Show mobile-specific controls
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      document.body.classList.add('is-touch');
    }
  }

  private setupCorrectionPlane(): void {
    if (!this.correctionPlane) return;

    let dragging = false;

    const updateFromPointer = (clientX: number, clientY: number) => {
      if (!this.correctionPlane) return;

      const rect = this.correctionPlane.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height);
      const radius = size * 0.42;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let offsetX = clientX - centerX;
      let offsetY = clientY - centerY;
      const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
      if (distance > radius) {
        const scale = radius / distance;
        offsetX *= scale;
        offsetY *= scale;
      }

      if (Math.abs(offsetX) < 1 && Math.abs(offsetY) < 1) {
        return;
      }

      this.renderer.correctionAngleH = Math.atan2(offsetY, offsetX);
      this.syncCorrectionUi();
    };

    this.correctionPlane.addEventListener('pointerdown', (event) => {
      dragging = true;
      this.correctionPlane?.setPointerCapture(event.pointerId);
      updateFromPointer(event.clientX, event.clientY);
    });

    this.correctionPlane.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      updateFromPointer(event.clientX, event.clientY);
    });

    const endDrag = (event: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      this.correctionPlane?.releasePointerCapture(event.pointerId);
    };

    this.correctionPlane.addEventListener('pointerup', endDrag);
    this.correctionPlane.addEventListener('pointercancel', endDrag);
    this.renderCorrectionPlane();
  }

  private renderCorrectionPlane(): void {
    if (!this.correctionPlane || !this.correctionPlaneContext) return;

    const ctx = this.correctionPlaneContext;
    const width = this.correctionPlane.width;
    const height = this.correctionPlane.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.42;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(0.5, 0.5);

    ctx.strokeStyle = 'rgba(105, 135, 190, 0.22)';
    ctx.lineWidth = 1;
    for (const factor of [0.33, 0.66, 1]) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * factor, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    ctx.fillStyle = 'rgba(210, 230, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    const velocity = this.sim.satellite.velocity;
    const horizontalSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    if (horizontalSpeed > 0) {
      this.drawPlanArrow(
        centerX,
        centerY,
        (velocity.x / horizontalSpeed) * radius * 0.9,
        (velocity.z / horizontalSpeed) * radius * 0.9,
        '#4fd9ff',
        'V'
      );
    }

    const direction = this.renderer.getCorrectionDirection();
    const horizontalCorrection = Math.sqrt(direction.x * direction.x + direction.z * direction.z);
    if (horizontalCorrection > 0.001) {
      this.drawPlanArrow(
        centerX,
        centerY,
        (direction.x / horizontalCorrection) * radius * 0.82,
        (direction.z / horizontalCorrection) * radius * 0.82,
        '#ff9b42',
        'C'
      );
    }

    ctx.fillStyle = 'rgba(145, 164, 192, 0.9)';
    ctx.font = '12px Segoe UI';
    ctx.fillText('forward', centerX - 22, centerY - radius - 10);
    ctx.fillText('aft', centerX - 8, centerY + radius + 18);
    ctx.fillText('port', centerX - radius - 28, centerY + 4);
    ctx.fillText('starboard', centerX + radius - 20, centerY + 4);

    ctx.restore();
  }

  private drawPlanArrow(
    centerX: number,
    centerY: number,
    offsetX: number,
    offsetY: number,
    color: string,
    label: string
  ): void {
    if (!this.correctionPlaneContext) return;

    const ctx = this.correctionPlaneContext;
    const endX = centerX + offsetX;
    const endY = centerY + offsetY;
    const angle = Math.atan2(offsetY, offsetX);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const headLength = 14;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - Math.cos(angle - Math.PI / 6) * headLength,
      endY - Math.sin(angle - Math.PI / 6) * headLength
    );
    ctx.lineTo(
      endX - Math.cos(angle + Math.PI / 6) * headLength,
      endY - Math.sin(angle + Math.PI / 6) * headLength
    );
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 12px Segoe UI';
    ctx.fillText(label, endX + Math.cos(angle) * 8 - 4, endY + Math.sin(angle) * 8 + 4);
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

    if (this.sim.state === 'paused' && this.sim.satellite.alive) {
      this.syncCorrectionUi();
    }

    // Poll gamepad
    this.gamepad.update();
  }

  private formatTimeScale(scale: number): string {
    if (scale < 86400) return `${(scale / 3600).toFixed(0)}h/s`;
    if (scale < 86400 * 30) return `${(scale / 86400).toFixed(0)}d/s`;
    return `${(scale / (86400 * 365.25)).toFixed(1)}y/s`;
  }
}
