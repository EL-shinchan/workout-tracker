# Saved Workout Plans Design

## Goal

Add Saved Plans so Coach Fox workout plans can be stored, reused, and started later.

Right now Coach Fox can create a plan and send it to the workout logger, but if the user leaves chat without starting it, the plan is temporary. Saved Plans make workout plans feel like a real product feature.

## Scope

### Included

- Save a Coach Fox generated workout plan from Chat.
- New `Plans`-style section/page for saved workout plans. To avoid confusion with payment `Plans`, call the feature `Workout Plans` in the UI.
- List saved workout plans with:
  - title
  - target
  - exercise count
  - created date
- View plan details:
  - warm-up
  - workout
  - cooldown
  - rest guidance
- `Start this workout` from a saved plan.
- Delete saved plans.
- Local browser storage V1, no backend database.

### Not Included

- No cloud sync.
- No sharing/public plans.
- No weekly calendar yet.
- No advanced program builder.
- No paid feature gate.

## UX

### Chat

When Coach Fox renders a structured workout plan, show two buttons:

```text
Start this workout
Save plan
```

`Start this workout` keeps existing behavior.

`Save plan` stores the plan in local browser storage and shows:

```text
Saved to Workout Plans.
```

### Navigation

Add a nav item:

```text
Workout Plans
```

This avoids confusion with the existing payment-preview `Plans` page.

Suggested file:

```text
public/workout-plans.html
```

### Workout Plans Page

Hero:

```text
Workout Plans
Save good Coach Fox sessions and reuse them later.
```

Empty state:

```text
No saved workout plans yet. Ask Coach Fox for a workout plan, then save it here.
```

Saved plan card:

```text
Upper chest workout
upper chest · 5 exercises · saved May 13
[Start this workout] [Delete]
```

Expandable/detail area can show the full structured plan.

## Storage

Use localStorage key:

```text
ironLogSavedWorkoutPlans
```

Each saved plan:

```json
{
  "id": "plan_...",
  "savedAt": "2026-05-13T15:49:00.000Z",
  "source": "coach-fox",
  "title": "Upper chest workout",
  "target": "upper chest",
  "durationMinutes": 60,
  "warmup": [],
  "exercises": [],
  "cooldown": [],
  "restGuidance": "60–90 sec between sets"
}
```

ID can be timestamp-based for V1.

## Start Saved Plan Flow

Starting a saved plan should reuse the existing Coach Fox draft flow:

1. Save selected plan into:

```text
ironLogCoachWorkoutPlanDraft
```

2. Navigate to:

```text
workout.html?planDraft=coach-fox
```

3. Existing workout draft loader fills the form.

## Frontend Architecture

Likely files:

- `public/scripts/chat.js`
- `public/workout-plans.html`
- `public/scripts/workout-plans.js`
- `public/styles/main.css`
- nav updates across pages
- `public/sw.js` cache update

Shared storage helper can be duplicated lightly in V1 or placed in `shared.js` if simple.

## Error Handling

- If localStorage save fails, show friendly message and keep the plan visible in chat.
- If saved plans list is corrupt, show a reset message and avoid crashing.
- Delete should confirm:

```text
Delete this saved workout plan?
```

## Validation

- `node --check public/scripts/chat.js`
- `node --check public/scripts/workout-plans.js`
- Workout Plans page serves after login.
- Chat plan has Save plan button.
- Save plan adds it to localStorage.
- Workout Plans page lists saved plan.
- Start saved plan opens workout draft loader.
- Delete removes saved plan.
- Existing payment-preview `Plans` page still works.

## Success Criteria

A user can:

1. Ask Coach Fox for a workout plan.
2. Save it.
3. Leave Chat.
4. Open Workout Plans later.
5. Start that saved plan as an editable workout draft.
