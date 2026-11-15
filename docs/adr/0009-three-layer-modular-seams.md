# Three-Layer Modular Seams

The codebase is partitioned into three decoupled layers: `core/` (pure TypeScript models, filtering, and serialization with zero DOM or browser API dependencies), `adapters/` (DOM querying and native UI injection), and `extension/` (Vite Manifest V3 entry points and lifecycle management). Isolating `core/` from browser APIs enables 100% unit-test coverage using standard Vitest runners in Node.js without requiring DOM simulation or browser mocks.
