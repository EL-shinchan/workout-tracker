# Coach Fox Logger Draft Polish

## Goal

Polish the New Workout page after a Coach Fox plan is loaded so it feels like an intentional editable draft, not a broken prefilled workout.

## Scope

- Make the loaded state clearly say: `Coach Fox plan loaded. Fill in real weights before saving.`
- Keep Coach Fox drafts editable and not auto-saved.
- Keep weights blank on purpose because Eddie must enter the real weight used.
- Make workout notes cleaner and explicit:
  - Warm-up
  - Cooldown
  - Rest guidance
  - weight reminder
- Improve validation errors when saving blank planned sets:
  - use exercise names instead of only exercise numbers
  - say the real weight needs to be entered
- Do not change backend save rules.

## UX Details

When `workout.html?planDraft=coach-fox` loads:

- Page title: `Start Coach Fox workout`
- Page copy: `Coach Fox loaded the plan. Fill in real weights, adjust anything, then save normally.`
- Status message: `Coach Fox plan loaded. Fill in real weights before saving.`
- Notes begin with a clear draft warning.

If saving with blank weight:

```text
Add the real weight you used for Set 1 in Bench press.
```

If reps are missing:

```text
Add valid reps for Set 1 in Bench press.
```

## Validation

- `node --check public/scripts/workout.js`
- Workout page still serves.
- Existing normal workout save path remains unchanged.
- Coach Fox plan draft loader still reads `ironLogCoachWorkoutPlanDraft` and clears it after loading.
