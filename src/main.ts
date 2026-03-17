import { Simulation } from './simulation.ts';
import { Renderer } from './renderer.ts';
import { UI } from './ui.ts';
import './style.css';

const container = document.getElementById('app')!;

const sim = new Simulation();
const renderer = new Renderer(container);
const ui = new UI(sim, renderer);

renderer.initSolarSystem(sim.bodies);

let lastTime = performance.now();

function gameLoop(now: number): void {
  const realDt = Math.min((now - lastTime) / 1000, 0.1); // cap at 100ms
  lastTime = now;

  sim.update(realDt);
  renderer.updateScene(sim);
  ui.update();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
