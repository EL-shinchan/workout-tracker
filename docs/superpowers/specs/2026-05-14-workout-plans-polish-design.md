# Workout Plans Polish Design

## Goal

Polish the Workout Plans page so saved Coach Fox plans feel useful and easy to reuse, not just stored data.

## Scope

### Included

- Improve saved-plan cards visually.
- Make `Start this workout` more obvious.
- Show plan target/type clearly.
- Show a compact exercise preview on each card.
- Improve empty state so the user knows how to save a plan from Coach Fox.
- Keep localStorage V1.
- Keep existing saved-plan start/delete behavior.

### Not Included

- No backend database.
- No cloud sync.
- No weekly planner yet.
- No plan editing yet.
- No paid feature gate.

## UX Changes

### Empty State

Current empty state is plain text. Replace with a helpful card:

```text
No saved plans yet
Ask Coach Fox for a workout plan, then tap Save plan.
[Ask Coach Fox]
```

### Saved Plan Card

Each saved plan should show:

- title
- target badge
- saved date
- exercise count
- compact preview of the first 3 workout exercises
- `+N more` if there are more than 3 exercises
- primary `Start workout` button
- secondary `View details`
- danger `Delete`

Example:

```text
Upper chest workout       upper chest
5 exercises · saved May 13
Bench press 4×10
Incline dumbbell press 3×10-12
Low-to-high cable fly 3×12-15
+2 more
[Start workout] [View details] [Delete]
```

### Details

Keep the existing detail section, but make it feel less hidden:

- summary text should say `View full plan`
- details should keep Warm-up / Workout / Cooldown / Rest sections

## Frontend Architecture

Likely files:

- `public/workout-plans.html`
- `public/scripts/workout-plans.js`
- `public/styles/main.css`

No changes needed to Coach Fox save flow unless the card needs extra data; existing saved plan shape is enough.

## Validation

- `node --check public/scripts/workout-plans.js`
- Workout Plans page serves after login.
- Empty state shows helpful CTA.
- Saved cards show first 3 workout exercises and `+N more` when needed.
- Start saved plan still opens `workout.html?planDraft=coach-fox`.
- Delete still confirms before removing.

## Success Criteria

A user opening Workout Plans should instantly understand:

1. what plans are saved
2. what exercises are inside
3. how to start one
4. how to create/save more plans
