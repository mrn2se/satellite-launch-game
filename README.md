# 🛰️ Satellite Launch Game

> ⚡ **Note:** This project was created with an AI-vibe coding approach, incorporating automated assistance and generative tools throughout development.

A real-time 3D space mission simulator where you launch a satellite from Earth and navigate it through the solar system's gravitational fields. The goal is to hit a target planet using realistic Newtonian physics.


## Features

### Core Gameplay
- **Real Physics Engine**: Velocity Verlet integration with accurate gravitational forces based on actual planetary masses
- **3D Solar System**: All 8 planets with exaggerated sizes for visibility but real orbital mechanics
- **Time Acceleration**: Adjust simulation speed from hours to years per second
- **Satellite Launch**: Configure launch angle and speed from Earth orbit
- **Trajectory Visualization**: See your satellite's path with a live trail
- **Win Condition**: Successfully hit your target planet

### Mission Control
- **Pause & Correction**: Pause mid-flight to apply course corrections
- **3D Direction Control**: Visual + numeric control for correction vector
- **Arrow Keys / Joystick Control**: Aim your maneuver in 3D space
- **Delta-V Adjustment**: Set thrust magnitude for course changes

### Visualization
- **Real-time Gravity Field**: Dense arrow visualization around each planet showing gravitational force vectors
- **Satellite Perspective View**: First-person view from the satellite looking forward
- **Orbit Camera**: Freely rotate view to inspect the solar system
- **Dynamic Updates**: Field visualization updates as planets move

### Input Support
- **Keyboard**: Full keyboard controls with hotkeys (Space=Pause, G=Gravity, V=Sat View)
- **Mouse**: Orbit camera controls, click to focus planets
- **Touch**: Full mobile support with on-screen buttons and joystick
- **Gamepad**: Full controller support (Xbox/PlayStation compatible)
  - Left Stick: Direction adjustment
  - Right Stick: Camera rotation
  - LT/RT: Delta-V adjustment
  - A/B/X/Y: Actions
  - D-Pad: Focus planets

### Responsive Design
- Desktop (wide UI panel with full controls)
- Tablet (collapsible panel, touch-friendly buttons)
- Mobile (floating action buttons, optimized layouts)

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/satellite-launch-game
cd satellite-launch-game

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open your browser to `http://localhost:5173/`

### Build for Production

[![Build and Deploy to GitHub Pages](https://github.com/mrn2se/satellite-launch-game/actions/workflows/deploy.yml/badge.svg)](https://github.com/mrn2se/satellite-launch-game/actions/workflows/deploy.yml)


```bash
pnpm build
pnpm preview  # Preview production build
```

## How to Play

1. **Setup Phase**
   - Select destination planet
   - Set launch angle (0-360°)
   - Set launch speed (1-100 km/s)
   - Click "Launch!"

2. **Flight Phase**
   - Observe satellite trajectory
   - Adjust time acceleration with the slider
   - Watch gravity field distort around massive bodies
   - Use focus buttons to navigate camera to planets

3. **Course Correction (when Paused)**
   - Press Space or click Pause
   - Use joystick/arrows to set correction direction
   - Adjust Delta-V (thrust magnitude)
   - Click "Apply Correction" to commit
   - Click Resume to continue

4. **Win/Lose Conditions**
   - **Win**: Satellite hits target planet
   - **Lose**: Crash into any other planet or drift too far into space

## Physics

The simulation uses:
- **Newtonian Gravitation**: F = G × m₁ × m₂ / r²
- **Velocity Verlet Integration**: For stable orbital mechanics
- **Real Planetary Data**:
  - Masses: NASA JPL Horizons
  - Semi-major Axes: Astronomical Unit (AU)
  - Orbital Periods: Real sidereal periods
- **Unit System**: AU for distances, m/s for velocities, seconds for time

### Realism Notes
- Planet sizes are exaggerated for visibility (but masses are real)
- No atmospheric drag, relativistic effects, or perturbations from minor bodies
- Initial planetary positions are approximate

## Architecture

### Source Structure
```
src/
├── types.ts              # Shared type definitions
├── physics.ts            # Gravity calculations & integration
├── solarSystem.ts        # Planetary data & orbital mechanics
├── simulation.ts         # Game logic & state management
├── renderer.ts           # Three.js 3D rendering
├── ui.ts                 # UI controls & interactivity
├── gamepad.ts            # Gamepad input handling
├── main.ts               # Entry point
└── style.css             # Styling

tests/
└── trajectory.test.ts    # Physics verification tests
```

### Key Classes
- **Simulation**: Game state, physics updates, collision detection
- **Renderer**: Three.js scene, camera, visualization, arrows
- **UI**: Control panel, keyboard/gamepad setup, mobile support
- **GamepadManager**: Gamepad input polling and mapping

## Testing

Run unit tests:
```bash
pnpm test             # Run once
pnpm test:watch       # Watch mode
```

Tests verify:
- Satellite falling into Sun with low velocity
- Stable circular orbit at 1 AU
- Gravity calculations and integrations

## Dependencies

### Runtime
- **three.js** (0.183.2) - 3D rendering engine - [MIT License](https://github.com/mrdoob/three.js/blob/dev/LICENSE)

### Development
- **TypeScript** (5.9.3) - Type-safe JavaScript - [Apache 2.0 License](https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt)
- **Vite** (8.0.0) - Build tool - [MIT License](https://github.com/vitejs/vite/blob/main/LICENSE)
- **Vitest** (4.1.0) - Unit testing - [MIT License](https://github.com/vitest-dev/vitest/blob/main/LICENSE)

## License

This project is licensed under the Mozilla Public License 2.0 (MPL-2.0).

See [LICENSE](LICENSE) file for details.

### Third-Party Licenses

All dependencies are compatible with MPL-2.0:
- three.js: MIT
- TypeScript: Apache 2.0
- Vite: MIT
- Vitest: MIT

### Data Attribution

Planetary data sourced from:
- **NASA JPL Horizons System** - Masses, orbital elements
- **IAU/IUPAC** - Planet definitions and naming
- **Public domain scientific data** - No copyright restrictions

## Development

### Code Quality
- TypeScript strict mode with `noUnusedLocals` and `noUnusedParameters`
- ESM modules throughout

### Browser Support
- Modern browsers with WebGL support
- Chrome/Firefox/Safari/Edge (recent versions)
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Known Limitations

1. Gravity field visualization can be performance-intensive on older hardware
2. No collision time-stepping (large time-scale jumps may miss collisions)
3. Planets treated as point masses (no shape/terrain collision)
4. No documentation for in-game shortcuts in help panel

## Future Enhancements

- [ ] More destination planets (asteroids, moons)
- [ ] Fuel management system
- [ ] Atmospheric drag simulation
- [ ] Multi-stage rockets
- [ ] Saved/replayed missions
- [ ] Multiplayer leaderboards
- [ ] Advanced orbital mechanics education mode
- [ ] VR support

## Contributing

Feel free to contribute bug fixes, features, or improvements!

## Support

For issues, questions, or suggestions, please open an GitHub issue.

---

**Made with ❤️ and WebGL** | Physics meets Fun
