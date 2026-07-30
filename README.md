<div align="center">
  <h1>🐍 NEON SNAKE</h1>
  <p><em>A cyberpunk / synthwave twist on the classic Snake game, built with Canvas 2D and Web Audio API.</em></p>

  <p>
    <a href="#features">Features</a> •
    <a href="#play">Play</a> •
    <a href="#controls">Controls</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#development">Development</a>
  </p>

  <br>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Canvas_2D-000000?style=for-the-badge&logo=html5&logoColor=white" alt="Canvas 2D"/>
  <img src="https://img.shields.io/badge/Web_Audio_API-FF6F00?style=for-the-badge&logo=web-audio-api&logoColor=white" alt="Web Audio API"/>
  <br><br>
</div>

---

## ✨ Features

- **🎨 3 Visual Themes** — NEON (cyan/magenta), EMBER (orange/gold), OCEAN (blue/green)
- **🎮 3 Game Modes** — Classic, Labyrinth (maze walls), Open World (infinite rooms with portals)
- **⚡ 5 Difficulty Levels** — Easy, Normal, Hard, Insane, Phantom (ghost mode)
- **🍎 6 Power-ups** — Slow Time, Ghost Mode, Score x2, Shield, Magnet, Shrink
- **🎵 Custom Soundtrack** — 10 original synthwave tracks that play seamlessly
- **💥 Particle System** — Explosions, screen shake, ripple effects on the grid
- **🏆 Score & Combo System** — Chain combos for multiplier bonuses
- **📱 Touch Controls** — Play on mobile with swipe gestures and on-screen D-Pad
- **🎚️ Audio-reactive Visuals** — Grid pulses in sync with the music
- **⚙️ Portfolio Mode** — Debug overlay showing FPS, tick rate, and engine internals

## 🎮 Controls

| Key | Action |
|-----|--------|
| `WASD` / `Arrow Keys` | Move the snake |
| `Space` | Pause / Resume |
| `P` | Toggle Portfolio Debug Mode |
| `Click` (mobile) | Tap D-Pad buttons or swipe on canvas |

## 🚀 Development

### Prerequisites
- [Node.js](https://nodejs.org/) v18+

### Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/neon-snake.git
cd neon-snake

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type-safe game logic & rendering |
| **Vite** | Fast dev server & bundler |
| **Canvas 2D API** | All game rendering — snake, grid, particles, effects |
| **Web Audio API** | Music playback, procedural SFX, audio analysis for reactive visuals |
| **HTML / CSS** | UI overlays, HUD, menus, responsive layout |

## 📁 Project Structure

```
src/
├── game.ts        # Main game loop (fixed timestep logic)
├── state.ts       # Central state manager (score, combo, powerups)
├── input.ts       # Keyboard + touch input with input queuing
├── renderer.ts    # Canvas 2D renderer (grid, snake, particles, effects)
├── audio.ts       # Web Audio API — music player + procedural SFX
├── config.ts      # All game config (difficulties, themes, powerups, visuals)
├── ui.ts          # HUD, menus, screens, debug overlay
├── App.tsx        # React entry (minimal)
├── main.tsx       # React mount
├── index.css      # Tailwind base
styles/
├── main.css       # All game styles — neon UI, responsive, animations
public/
  music/           # Synthwave soundtrack (track01.mp3 – track10.mp3)
```

## 🖌️ Architecture Highlights

- **Fixed Timestep Game Loop** — Snake movement runs at a consistent tick rate, while rendering interpolates between frames for smooth visuals.
- **Input Queue System** — Buffers up to 2 directional inputs per tick to prevent missed keypresses.
- **Audio-reactive Grid** — The analyser node feeds frequency data into the renderer, making the grid pulse to the beat.
- **Depth & Camera System** — Subtle board tilt, camera overshoot, and screen shake add tactile feedback.

## 📄 License

This project is provided under the [Apache 2.0 License](LICENSE).

---

<div align="center">
  <sub>Built with ❤️ and ☕ by <a href="https://github.com/SergeRybak">Serge Rybak</a></sub>
  <br>
  <sub>Synthwave soundtrack by Lyserge, Serge Rybak, and contributors</sub>
</div>
