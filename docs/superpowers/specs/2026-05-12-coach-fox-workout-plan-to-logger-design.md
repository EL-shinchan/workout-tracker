# Coach Fox Workout Plan to Logger Design

## Goal

Upgrade Coach Fox from answering exercise questions into creating structured workout plans that can be sent into the Workout logger as editable drafts.

User example:

```text
Today I will be working on chest. Create me a 1hr long efficient workout plan.
```

Coach Fox should respond with a clean plan like:

```text
Warm-up:
- Push-ups — 3×10

Workout:
- Bench press — 4×10-12
- Incline dumbbell press — 3×10-12

Cooldown:
- Chest doorway stretch — 2 min
```

Then offer:

```text
Start this workout
```

Clicking that button opens `workout.html` with the plan filled into the workout form as a draft. The workout is **not auto-saved**.

## Scope

### Included

- Chat-only plan generation UI with a `Start this workout` button.
- Local plan templates for common targets:
  - chest
  - back
  - legs
  - shoulders
  - arms
  - full body
- Detect common plan requests:
  - `create me a 1hr chest workout`
  - `today I am working on chest`
  - `make a leg day plan`
  - `build me a back workout`
- Plan includes:
  - warm-up
  - workout exercises
  - cooldown
  - simple rest guidance
- Send plan into New Workout as an editable draft.
- Existing workout save flow remains unchanged.

### Not Included

- No auto-saving workouts from chat.
- No multi-week program builder yet.
- No personalized medical/injury programming.
- No advanced strength-periodization logic.
- No timer system yet.
- No AI-only dependency for V1.

## Safety Rules

- Medical/injury safety must still run before workout planning.
- If the user says pain/injury/sick, do not generate a normal workout plan.
- Plans should be beginner-safe:
  - no one-rep max testing
  - no forced failure
  - no extreme volume
  - use controllable weight
  - include rest times
- Plan should remind the user to adjust weight and stop if something hurts.

## Plan Format

Coach Fox chat response should be structured and readable.

Example:

```text
Chest workout — about 60 minutes

Warm-up:
- Push-ups — 3×10
- Band pull-aparts — 2×15
- Light dumbbell press — 2×12

Workout:
- Bench press — 4×10-12
- Incline dumbbell press — 3×10-12
- Cable fly — 3×12-15
- Tricep pushdown — 3×12
- Plank — 3×45 sec

Cooldown:
- Chest doorway stretch — 2 min
- Shoulder stretch — 2 min

Rest:
- 60–90 sec between sets
- Use a weight you can control
```

## Draft Transfer Behavior

When user clicks `Start this workout`:

1. Store the plan draft in browser storage.
2. Navigate to:

```text
workout.html?planDraft=coach-fox
```

3. `workout.js` reads the draft.
4. Workout form is filled:
   - title: `<Target> workout`
   - date: today
   - notes: Coach Fox plan notes + warm-up/cooldown/rest guidance
   - exercises: main workout exercises only
5. Each exercise gets planned sets/reps.
6. Weight fields should stay blank or `0`?

Decision: use blank weight fields in UI if possible, but the current save validation requires weight > 0. Therefore:

- Draft display should leave weight blank for review.
- User must fill real weights before saving.
- Set notes should contain planned reps if the existing set row only supports one rep value.

For rep ranges like `10-12`, use:

- reps field: `10`
- notes: `Plan: 10-12 reps`

For time-based work like `45 sec plank`, use:

- reps field: `1`
- notes: `Plan: 45 sec hold`

## Data Shape

Use local browser storage, not backend.

Suggested key:

```text
ironLogCoachWorkoutPlanDraft
```

Suggested object:

```json
{
  "source": "coach-fox",
  "createdAt": "2026-05-12T10:40:00.000Z",
  "title": "Chest workout",
  "target": "chest",
  "durationMinutes": 60,
  "warmup": [
    { "name": "Push-ups", "sets": 3, "reps": "10" }
  ],
  "exercises": [
    { "name": "Bench press", "sets": 4, "reps": "10-12", "notes": "Main chest press" }
  ],
  "cooldown": [
    { "name": "Chest doorway stretch", "duration": "2 min" }
  ],
  "restGuidance": "60–90 sec between sets. Use a weight you can control."
}
```

## Local Plan Templates

### Chest

Warm-up:
- Push-ups — 3×10
- Band pull-aparts — 2×15
- Light dumbbell press — 2×12

Workout:
- Bench press — 4×10-12
- Incline dumbbell press — 3×10-12
- Cable fly — 3×12-15
- Tricep pushdown — 3×12
- Plank — 3×45 sec

### Back

Warm-up:
- Band pull-aparts — 2×15
- Scapular pull-ups or dead hangs — 2×20 sec
- Light cable row — 2×12

Workout:
- Lat pulldown — 4×10-12
- Seated cable row — 3×10-12
- Dumbbell row — 3×10 each side
- Face pull — 3×12-15
- Back extension — 2×12

### Legs

Warm-up:
- Bodyweight squats — 3×10
- Walking lunges — 2×10 each leg
- Light leg press — 2×12

Workout:
- Leg press — 4×10-12
- Romanian deadlift — 3×10
- Leg extension — 3×12-15
- Leg curl — 3×12-15
- Calf raise — 4×12-15

### Shoulders

Warm-up:
- Arm circles — 2×20 sec
- Band pull-aparts — 2×15
- Light lateral raise — 2×12

Workout:
- Shoulder press — 4×8-10
- Lateral raise — 4×12-15
- Rear delt fly — 3×12-15
- Face pull — 3×12-15
- Plank — 3×45 sec

### Arms

Warm-up:
- Light curls — 2×15
- Light tricep pushdowns — 2×15

Workout:
- Bicep curl — 4×10-12
- Tricep pushdown — 4×10-12
- Hammer curl — 3×10-12
- Overhead tricep extension — 3×10-12
- Cable curl — 2×12-15

### Full body

Warm-up:
- Bodyweight squats — 2×10
- Push-ups — 2×8
- Band pull-aparts — 2×15

Workout:
- Squat or leg press — 3×8-10
- Bench press — 3×8-10
- Lat pulldown — 3×10-12
- Romanian deadlift — 3×10
- Shoulder press — 2×10

## Frontend Architecture

Likely files:

- `public/scripts/chat.js`
- `public/scripts/workout.js`
- `public/styles/main.css`

Chat additions:

- `detectWorkoutPlanRequest(question)`
- `buildWorkoutPlan(target, durationMinutes)`
- `formatWorkoutPlan(plan)`
- `addWorkoutPlanMessage(plan)`
- `savePlanDraftAndOpenWorkout(plan)`

Workout additions:

- read `planDraft=coach-fox`
- load `ironLogCoachWorkoutPlanDraft`
- convert plan exercises into existing exercise cards
- set workout title/date/notes
- clear draft after loading to avoid accidental reuse
- show status message: `Coach Fox plan loaded. Review weights before saving.`

## Error Handling

- If no target is detected, Coach Fox should ask one clear follow-up:

```text
What are we training today — chest, back, legs, shoulders, arms, or full body?
```

- If plan draft storage fails, show a friendly message and keep the plan in chat.
- If `workout.html?planDraft=coach-fox` opens without a draft, show normal workout form and a small status message if possible.
- If an exercise is not in the exercise library, use the existing custom exercise behavior.

## Validation

Minimum checks:

- `node --check public/scripts/chat.js`
- `node --check public/scripts/workout.js`
- Chat detects and builds plan for:
  - `create me a 1hr chest workout`
  - `today i will be working on chest`
  - `make a leg day plan`
- Medical safety still wins:
  - `my shoulder hurts, create chest workout`
- `Start this workout` stores draft and opens `workout.html?planDraft=coach-fox`.
- Workout page loads draft into editable form.
- User still must fill real weights before saving.
- Normal workout logging still works.

## Success Criteria

Coach Fox can create a practical one-hour workout plan and hand it to the logger without auto-saving.

The user experience should feel like:

1. Ask Coach Fox for a plan.
2. Review the structured plan.
3. Tap `Start this workout`.
4. Edit weights/reps if needed.
5. Save normally.
