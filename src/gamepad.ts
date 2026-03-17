import type { Simulation } from './simulation.ts';
import type { Renderer } from './renderer.ts';

const DEADZONE = 0.15;

export class GamepadManager {
  private connected = false;
  private gamepadIndex = -1;
  private prevButtons: boolean[] = [];
  private sim: Simulation;
  private renderer: Renderer;
  private onPauseToggle: () => void;
  private onApplyCorrection: () => void;
  private onGravityToggle: () => void;
  private onSatViewToggle: () => void;
  private onLaunch: () => void;
  private onReset: () => void;

  constructor(
    sim: Simulation,
    renderer: Renderer,
    onPauseToggle: () => void,
    onApplyCorrection: () => void,
    onGravityToggle: () => void,
    onSatViewToggle: () => void,
    onLaunch: () => void,
    onReset: () => void
  ) {
    this.sim = sim;
    this.renderer = renderer;
    this.onPauseToggle = onPauseToggle;
    this.onApplyCorrection = onApplyCorrection;
    this.onGravityToggle = onGravityToggle;
    this.onSatViewToggle = onSatViewToggle;
    this.onLaunch = onLaunch;
    this.onReset = onReset;

    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = (e as GamepadEvent).gamepad.index;
      this.connected = true;
      this.showNotification('Gamepad connected');
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.connected = false;
      this.gamepadIndex = -1;
    });
  }

  private showNotification(text: string): void {
    let el = document.getElementById('gamepad-notify');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gamepad-notify';
      el.style.cssText =
        'position:fixed;bottom:20px;right:20px;background:rgba(10,10,30,0.9);' +
        'border:1px solid rgba(100,150,255,0.5);border-radius:8px;padding:10px 18px;' +
        'color:#88ddff;font-size:13px;z-index:30;transition:opacity 0.5s;';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.opacity = '1';
    setTimeout(() => { el!.style.opacity = '0'; }, 2000);
  }

  private applyDeadzone(val: number): number {
    return Math.abs(val) < DEADZONE ? 0 : val;
  }

  private wasPressed(idx: number, buttons: readonly GamepadButton[]): boolean {
    const now = buttons[idx]?.pressed ?? false;
    const prev = this.prevButtons[idx] ?? false;
    return now && !prev;
  }

  update(): void {
    if (!this.connected) return;
    const gp = navigator.getGamepads()[this.gamepadIndex];
    if (!gp) return;

    const leftX = this.applyDeadzone(gp.axes[0] ?? 0);
    const leftY = this.applyDeadzone(gp.axes[1] ?? 0);
    const rightX = this.applyDeadzone(gp.axes[2] ?? 0);
    const rightY = this.applyDeadzone(gp.axes[3] ?? 0);

    // Camera control (right stick) — orbit camera rotation
    if (this.sim.state !== 'setup') {
      if (Math.abs(rightX) > 0 || Math.abs(rightY) > 0) {
        const azimuth = this.renderer.controls.getAzimuthalAngle();
        const polar = this.renderer.controls.getPolarAngle();
        this.renderer.controls.minAzimuthAngle = -Infinity;
        this.renderer.controls.maxAzimuthAngle = Infinity;
        // Rotate by mapping stick to angle deltas
        const newAzimuth = azimuth + rightX * 0.04;
        const newPolar = Math.max(0.1, Math.min(Math.PI - 0.1, polar + rightY * 0.04));
        this.renderer.controls.minAzimuthAngle = newAzimuth;
        this.renderer.controls.maxAzimuthAngle = newAzimuth;
        this.renderer.controls.minPolarAngle = newPolar;
        this.renderer.controls.maxPolarAngle = newPolar;
        this.renderer.controls.update();
        this.renderer.controls.minAzimuthAngle = -Infinity;
        this.renderer.controls.maxAzimuthAngle = Infinity;
        this.renderer.controls.minPolarAngle = 0;
        this.renderer.controls.maxPolarAngle = Math.PI;
      }
    }

    // When paused: left stick adjusts correction direction
    if (this.sim.state === 'paused' && this.sim.satellite.alive) {
      if (Math.abs(leftX) > 0 || Math.abs(leftY) > 0) {
        this.renderer.correctionAngleH += leftX * 0.05;
        this.renderer.correctionAngleV -= leftY * 0.05;
        this.renderer.correctionAngleV = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.renderer.correctionAngleV));
        this.renderer.updateCorrectionDirection();
        this.syncCorrectionToUI();
      }

      // Triggers (LT/RT) adjust delta-V
      const lt = gp.buttons[6]?.value ?? 0;
      const rt = gp.buttons[7]?.value ?? 0;
      if (lt > 0.1 || rt > 0.1) {
        this.renderer.correctionDeltaV = Math.max(0, Math.min(10000,
          this.renderer.correctionDeltaV + (rt - lt) * 50));
        this.renderer.updateCorrectionDirection();
        this.syncDeltaVToUI();
      }
    }

    // When in setup: left stick adjusts launch angle/speed
    if (this.sim.state === 'setup') {
      if (Math.abs(leftX) > 0) {
        const el = document.getElementById('launch-angle') as HTMLInputElement;
        el.value = String(Math.round((parseFloat(el.value) + leftX * 2 + 360) % 360));
      }
      if (Math.abs(leftY) > 0) {
        const el = document.getElementById('launch-speed') as HTMLInputElement;
        el.value = String(Math.max(1, Math.min(100, parseFloat(el.value) - leftY * 0.3)));
      }
    }

    // Button mappings (standard gamepad layout):
    // A=0: Launch (setup) or Apply Correction (paused)
    // B=1: Reset
    // X=2: Gravity toggle
    // Y=3: Sat view toggle
    // Start=9: Pause/Resume
    // Back/Select=8: nothing

    if (this.wasPressed(0, gp.buttons)) {
      if (this.sim.state === 'setup') this.onLaunch();
      else if (this.sim.state === 'paused') this.onApplyCorrection();
    }
    if (this.wasPressed(1, gp.buttons)) this.onReset();
    if (this.wasPressed(2, gp.buttons)) this.onGravityToggle();
    if (this.wasPressed(3, gp.buttons)) this.onSatViewToggle();
    if (this.wasPressed(9, gp.buttons)) this.onPauseToggle();

    // DPad: focus on planets
    const planets = ['Sun', 'Earth', 'Mars', 'Jupiter'];
    if (this.wasPressed(12, gp.buttons)) this.renderer.focusOnPlanet(planets[0]); // up=Sun
    if (this.wasPressed(13, gp.buttons)) this.renderer.focusOnPlanet(planets[1]); // down=Earth
    if (this.wasPressed(14, gp.buttons)) this.renderer.focusOnPlanet(planets[2]); // left=Mars
    if (this.wasPressed(15, gp.buttons)) this.renderer.focusOnPlanet(planets[3]); // right=Jupiter

    // Zoom with bumpers (LB=4, RB=5)
    if (gp.buttons[4]?.pressed) {
      this.renderer.orbitCamera.position.multiplyScalar(1.02);
    }
    if (gp.buttons[5]?.pressed) {
      this.renderer.orbitCamera.position.multiplyScalar(0.98);
    }

    // Save button state for edge detection
    this.prevButtons = gp.buttons.map(b => b.pressed);
  }

  private syncCorrectionToUI(): void {
    const dir = this.renderer.getCorrectionDirection();
    (document.getElementById('corr-dx') as HTMLInputElement).value = dir.x.toFixed(2);
    (document.getElementById('corr-dy') as HTMLInputElement).value = dir.y.toFixed(2);
    (document.getElementById('corr-dz') as HTMLInputElement).value = dir.z.toFixed(2);
  }

  private syncDeltaVToUI(): void {
    (document.getElementById('corr-dv') as HTMLInputElement).value = Math.round(this.renderer.correctionDeltaV).toString();
  }
}
