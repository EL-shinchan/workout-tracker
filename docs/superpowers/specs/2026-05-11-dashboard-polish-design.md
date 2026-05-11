# Dashboard Polish Design

## Goal

Turn the Iron Log dashboard into a real daily command center instead of only a workout stats page.

The dashboard should quickly answer:

- What should I do next?
- How is today going?
- Did I train recently?
- Am I on track with nutrition?
- Where should I jump next?

## Scope

### Included

- Redesign `index.html` dashboard layout.
- Keep current light colorful visual direction.
- Add nutrition summary for today.
- Add Coach Fox quick ask card.
- Keep workout stats and recent sessions.
- Keep recent PRs.
- Add stronger quick actions for Workout, Nutrition, Chat, Progress.
- Mobile-friendly layout.

### Not Included

- No new database tables.
- No new payments/plans work.
- No chat history on dashboard.
- No automatic recommendations beyond simple summaries.

## User Experience

### Hero / Daily Command Center

Replace old hero copy with a more complete daily message:

- title: `Today's command center`
- copy: workouts, food, and Coach Fox in one place
- primary action: `Log workout`
- secondary action: `Log food`
- tertiary action: `Ask Coach Fox`

Hero side cards:

- Today's date
- Last workout date or `No workout yet`
- Nutrition progress quick state

### Top Stat Cards

Keep useful existing stats:

- total workouts
- logged sets
- total PRs
- last workout

Remove or de-emphasize exercise library if space is tight.

### Today Nutrition Panel

Add a panel that calls:

```text
GET /api/nutrition/day
```

Show:

- calories eaten / goal
- protein eaten / goal
- carbs eaten / goal
- fat eaten / goal
- small progress bars
- link to `nutrition.html`

If goals are missing, show:

```text
Set nutrition goals to track today.
```

### Coach Fox Quick Ask

Add a card with:

- short prompt input
- button/link to Chat

V1 behavior for dashboard polish:

- Keep it simple: input redirects to `chat.html?ask=<encoded question>`.
- Update Chat page later/now to read `ask` param and submit it automatically if present.

If that feels too much, quick ask can just link to Chat for this version.

Preferred: implement `ask` param because it feels app-like and useful.

### Recent Workouts and PRs

Keep recent workout cards and recent PR cards, but visually tighten them:

- fewer cards on dashboard, maybe 3 recent workouts and 3 PRs
- direct links to full pages
- empty states should guide action

### Quick Actions

Show four quick action cards:

1. Log workout
2. Log food
3. Ask Coach Fox
4. View progress

## API Needs

No new backend API required if `GET /api/nutrition/day` already exists.

Dashboard JS should load in parallel:

- `/api/workouts`
- `/api/exercises`
- `/api/prs/recent?limit=3`
- `/api/nutrition/day`

## Frontend Files

- `public/index.html`
- `public/scripts/dashboard.js`
- `public/scripts/chat.js` for optional `ask` param support
- `public/styles/main.css`

## Safety / Tone

Dashboard should be motivating but not shamey.

Good language:

- `Still time to log today.`
- `No food logged yet — start simple.`
- `You are over goal` instead of `failed`.

Avoid:

- guilt language
- weight-loss pressure
- medical claims

## Validation

Minimum checks:

- `node --check public/scripts/dashboard.js`
- `node --check public/scripts/chat.js` if changed
- dashboard page serves after login
- dashboard loads if nutrition goals are empty
- dashboard loads if no workouts exist
- nutrition summary matches `/api/nutrition/day`
- quick ask opens Chat with the question
- mobile layout does not collapse awkwardly
