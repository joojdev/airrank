/**
 * Paper UI entry point. The real bundle (bundle.js, CSS, index.d.ts) has not been vendored yet,
 * so this re-exports a local wrapper with the same component names. Swapping in the bundle is a
 * change to this file only (see specs/001-higher-lower-mvp/research.md R3).
 */
export { Button, Icon, Window } from "./wrapper";
