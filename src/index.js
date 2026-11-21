// Public entry point for ts-geohash.
// The package is ESM-only; re-export the core API so consumers can import
// either from the package root or from src/core.js directly.
export { encode, decode, DEFAULT_PRECISION, MAX_PRECISION } from './core.js';
