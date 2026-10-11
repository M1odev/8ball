---
name: Vite global shadowing
description: A module-level window binding can break injected React Fast Refresh code even when TypeScript passes.
---

Avoid declaring a module-level variable named `window` in React component modules.

**Why:** Vite's injected Fast Refresh code references the browser `window`. A local binding shadows it and produces a misleading “can't detect preamble” runtime error despite a successful type check.

**How to apply:** Use descriptive names for visual geometry and other constants. When a newly added component triggers a preamble error, check for shadowed browser globals before changing the Vite configuration.
