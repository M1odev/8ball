---
name: Configuration validation
description: Required validation path for changing protected Replit configuration.
---

Change `.replit` by writing its full updated TOML to a temporary workspace file
and calling `verifyAndReplaceDotReplit({ tempFilePath: absolutePath })`.

**Why:** Direct `.replit` patches are rejected by the environment even when the
deployment instructions describe a setting that belongs in that file.

**How to apply:** Use this flow for project pre-build hooks or other `.replit`
changes. Artifact production configuration separately requires a temp TOML and
`verifyAndReplaceArtifactToml`; do not bypass either validation path.
