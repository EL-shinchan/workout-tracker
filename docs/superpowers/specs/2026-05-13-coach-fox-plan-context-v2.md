# Coach Fox Plan Context V2

## Goal

Fix Coach Fox workout-plan conversations so natural plan requests and follow-ups stay in structured workout-plan mode instead of falling back to paragraph answers.

Reported issues:

- `workout plan for upper chest` returned a paragraph instead of the local structured plan format.
- `can you please list it out` did not continue the previous workout-plan context.

## Scope

- Add local `upper chest` workout plan template.
- Recognize `upper chest` before generic `chest`.
- Broaden workout-plan detection so `workout plan for upper chest` works without requiring words like `create` or `make`.
- Remember the last generated local workout plan in browser memory for the current chat session.
- If user asks `list it out`, `make it a list`, `show full list`, or similar, resend the last plan in structured Warm-up / Workout / Cooldown / Rest format.
- Keep medical safety first.
- Keep `Start this workout` button behavior unchanged.

## Validation

- `node --check public/scripts/chat.js`
- `workout plan for upper chest` should produce a structured local plan.
- `can you please list it out` after a local plan should resend the structured plan.
- `my chest hurts during bench press` should still return safety guidance.
