---
name: 8ball product direction
description: User-stated intent for future multiple-choice responses and screen layout.
---

The user wants multiple-choice response weights shown as bars between the eight ball and the prompt box. The MVP now includes Claude context preparation followed by Jev, supporting only multiple choice and noul, not score.

**Why:** The user explicitly requested this placement and scope when moving beyond the static frontend.

**How to apply:** Preserve the minimalist ball-centered layout and space for result bars above the prompt. Do not add score types or accounts without a new request.

Full prompts and responses should be inspectable in the console by users and curious developers.

**Why:** The user explicitly requested transparent, full exchanges rather than truncated summaries.

**How to apply:** Keep browser traces limited to that user's request and keep credentials out of logs. Full prompt text is intentionally visible; do not silently remove this transparency when changing the AI pipeline.

Claude should preserve explicitly named alternatives with short, unembellished labels and should not invent evasive alternatives for subjective comparisons.

**Why:** The user objected to added "No meaningful difference" choices and parenthetical descriptions appended to brand names.

**How to apply:** Put context, qualifications, and uncertainty in the state; leave Jev to weigh the actual options. Do not confuse a subjective question with a request to evaluate whether objective certainty is possible.

Research should be on demand: Claude decides whether evidence is needed, Hack Club Exa supplies it, and Claude then rebuilds the prompt for Jev.

**Why:** The user requested this sequence, not mandatory search on every question or an Exa-generated answer replacing Jev.

**How to apply:** Preserve Jev as the final decision maker and keep retrieved evidence distinct from assumptions. Limit research rounds to keep response time and shared API usage bounded.

Predictive questions should produce best-effort probability estimates, not proof checks that map unconfirmed outcomes to "no".

**Why:** The user identified admissions prompts as a failure case and said estimating probabilities under uncertainty is the point.

**How to apply:** Claude prepares evidence and assumptions without choosing the answer; Jev estimates likelihood. Keep Claude's prohibition on supplying its own probabilities distinct from Jev's forecasting task.
