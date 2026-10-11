---
name: Hack Club model routing
description: Difference between model catalog availability and interactive chat support.
---

A model's presence in Hack Club's catalog does not guarantee its batch variant works for interactive chat.

**Why:** The user's selected Claude Haiku 5.5 `:batch` variant was listed, but authenticated chat-completion requests returned HTTP 404. The corresponding non-batch variant worked with the same endpoint and credential.

**How to apply:** Preserve the working interactive model unless asked to change it. When changing models, verify a real completion rather than relying only on catalog membership. This is an observed provider behavior, not a claim that all batch variants are permanently unsupported.
