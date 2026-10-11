---
name: Concurrent editor saves
description: Recognizing repeated loss of file edits during simultaneous editing.
---

Pause and coordinate when successful patches repeatedly disappear and the same file gains independent editor changes.

**Why:** During simultaneous UI edits, the frontend entry file was restored to an older buffer multiple times, removing agent wiring and restoring a syntax error. Reapplying the same patch did not resolve the conflict.

**How to apply:** Preserve the user's newest copy changes and ask them to pause editing the conflicting file before continuing. Do not repeatedly replace their buffer or move the app to a different entry file to bypass their edits.
