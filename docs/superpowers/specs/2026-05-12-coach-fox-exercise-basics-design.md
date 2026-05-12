# Coach Fox Exercise Basics Design

## Goal

Polish Coach Fox so common beginner exercise questions still get useful answers even when Gemini is unavailable.

Eddie asked Coach Fox questions like:

- `what is lat pulldown`
- `what is lat raise`

Coach Fox fell through to AI and showed:

```text
Coach Fox AI is unavailable right now. Local basics still work.
```

That is technically safe, but bad product feel. These are basic gym questions Coach Fox should know locally.

## Scope

### Included

- Expand Coach Fox's local workout answer library.
- Cover common beginner gym movements.
- Add aliases for common wording mistakes and shorthand.
- Keep answers short, beginner-friendly, and safe.
- Keep local medical/injury safety behavior first.
- Keep Gemini fallback for unknown questions.
- Improve unavailable fallback copy so it feels less like a dead end.

### Not Included

- No exercise video demonstrations.
- No image recognition.
- No personalized programming algorithm.
- No diagnosis of pain or injuries.
- No backend database changes.
- No paid feature gating.

## Exercise Library V1 Additions

Add local answers for at least:

- lat pulldown
- lateral raise / lat raise
- shoulder press
- bicep curl
- tricep pushdown
- leg press
- leg curl
- leg extension
- Romanian deadlift / RDL
- calf raise

Existing answers should stay:

- bench press
- squat
- deadlift
- pull-up
- row
- beginner sets
- beginner reps
- training every day

## Answer Shape

Each exercise answer should usually include:

1. What it trains.
2. Simple explanation of the movement.
3. 1–2 form cues.
4. Beginner-safe warning.

Example:

```text
Lat pulldown trains your lats, upper back, and biceps. Sit tall, pull the bar toward your upper chest, and think elbows down toward your ribs. Do not yank with your body — use a weight you can control.
```

## Alias Rules

Coach Fox should catch common beginner phrasing:

- `lat pulldown`, `lat pull down`, `pulldown`, `pull down machine`
- `lateral raise`, `lat raise`, `side raise`, `dumbbell raise`
- `shoulder press`, `overhead press`, `military press`
- `bicep curl`, `biceps curl`, `curl`
- `tricep pushdown`, `triceps pushdown`, `pushdown`
- `leg press`
- `leg curl`, `hamstring curl`
- `leg extension`, `quad extension`
- `romanian deadlift`, `rdl`
- `calf raise`, `calves`

Avoid overly broad aliases that create wrong matches. For example, `press` alone should not automatically mean shoulder press because it could be bench press or leg press.

## Safety Order

Local response order must remain:

1. Normalize text.
2. Medical/injury safety answer first.
3. Nutrition local answer.
4. Workout local answer.
5. Gemini fallback.
6. Friendly AI-unavailable fallback if Gemini fails.

This prevents questions like `my shoulder hurts during lateral raises` from receiving a normal exercise tutorial.

## Unavailable Fallback Copy

Current fallback:

```text
Coach Fox AI is unavailable right now. Local basics still work.
```

Keep the message short, but make it more useful:

```text
Coach Fox AI is unavailable right now. I can still answer common food and exercise basics locally — try asking about lat pulldown, lateral raise, protein, or calories.
```

Use the same fallback in frontend and backend if both define it.

## Frontend Architecture

Likely file:

- `public/scripts/chat.js`

Optional cleanup:

- Extract workout answers into clearer grouped objects inside the same file.
- Do not introduce a new backend service or database for this small polish.

## Backend Architecture

No backend change is required unless fallback message is duplicated in `server/routes/chat.js`.

If fallback text is duplicated, update both places so behavior is consistent.

## Validation

Minimum checks:

- `node --check public/scripts/chat.js`
- `node --check server/routes/chat.js` if touched
- Local chat answer exists for:
  - `what is lat pulldown`
  - `what is lat raise`
  - `what is lateral raise`
  - `what is rdl`
- Medical safety still wins:
  - `my shoulder hurts during lateral raises`
  - should return safety-style response, not exercise tutorial
- Unknown question still attempts Gemini fallback.
- Missing Gemini key still returns improved unavailable message.

## Success Criteria

Coach Fox should feel useful even offline / without Gemini for common gym basics.

A beginner should be able to ask `what is [common exercise]` and get a short practical explanation instead of an unavailable AI message.
