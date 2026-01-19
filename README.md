# Project Description: High-Performance React Drawing Suite
##  Overview
A sophisticated, browser-based digital illustration tool built with React and the HTML5 Canvas API. This project replicates the core functionality of professional design software, focusing on high-frequency event handling and robust state management.

## Technical Highlights
Optimized Drawing Engine: Implemented a low-level drawing interface using useRef to bypass the React virtual DOM overhead. This ensures 60fps performance by preventing unnecessary re-renders during high-frequency mousemove events.

Undo/Redo via Stack Architecture: Developed a non-linear history system using two Stack data structures. This manages canvas state snapshots, allowing for seamless navigation through the user's creative timeline.

Complex Event Synchronization: Solved "Stale Closure" challenges within React useEffect hooks to ensure drawing functions maintain access to the latest application state (color, brush size, and brush type) without breaking event listener persistence.

Dynamic Brush Algorithms: Engineered multiple brush "personalities" (Marker, Pen, and Airbrush) by manipulating Canvas 2D context properties such as globalAlpha for transparency and shadowBlur for Gaussian-style soft edges.

### How to Run
1. Clone the repository.
2. Ensure you have Docker installed.
3. Run `docker-compose up` to start the development server.
4. Open `localhost:3000` in your browser.
