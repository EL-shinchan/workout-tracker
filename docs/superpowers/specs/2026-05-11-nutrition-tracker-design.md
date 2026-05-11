# Nutrition Tracker V1 Design

## Goal

Add a Nutrition page to Iron Log so Eddie can record daily food intake and compare it against goals.

V1 tracks full macros:

- calories
- protein
- carbs
- fat

The page should support manual logging first, with an optional Coach Fox estimate flow for natural food descriptions.

## Scope

### Included

- New `Nutrition` page in app navigation.
- Per-user daily macro goals.
- Goals are the same every day in V1.
- Food entries are saved per logged-in user.
- Food entries have date and meal type.
- Today summary shows eaten, goal, and remaining.
- Date picker/history view for past days.
- Coach Fox estimate helper that fills the form with editable estimated macros.

### Not Included

- No barcode scanner.
- No automatic food database lookup.
- No meal plan generator.
- No weight-loss/weight-gain prescription.
- No exact medical diet advice.
- No micronutrients yet.

## User Experience

Add a new nav item:

```text
Nutrition
```

The Nutrition page has four main areas:

1. Today summary
2. Daily goals
3. Add food entry
4. Entries for selected day

### Today Summary

Show cards/progress bars for:

- Calories eaten / goal / remaining
- Protein eaten / goal / remaining
- Carbs eaten / goal / remaining
- Fat eaten / goal / remaining

If no goal is set, show `Set a goal to track progress.`

### Daily Goals

A small form lets the user set same-every-day goals:

- calories goal
- protein goal in grams
- carbs goal in grams
- fat goal in grams

Goals are stored per user.

### Food Entry Form

Fields:

- date
- meal type: breakfast, lunch, dinner, snack
- food name
- calories
- protein grams
- carbs grams
- fat grams
- notes optional

Save button adds the entry to the selected day.

Entries can be deleted if the user logs something wrong.

### Coach Fox Estimate Flow

The page includes an estimate helper:

Input example:

```text
2 eggs and a banana
```

Button:

```text
Estimate with Coach Fox
```

Behavior:

1. User types natural food description.
2. Frontend sends it to a backend estimate endpoint.
3. Backend asks Gemini to estimate calories/protein/carbs/fat.
4. Result fills the food entry form.
5. Entry is clearly labeled as an estimate.
6. User can edit numbers before saving.

Coach Fox estimate must never save automatically.

## Data Model

Use SQLite.

### `nutrition_goals`

One row per user.

Fields:

- `user_id`
- `calories_goal`
- `protein_goal`
- `carbs_goal`
- `fat_goal`
- `updated_at`

### `nutrition_entries`

Fields:

- `id`
- `user_id`
- `entry_date`
- `meal_type`
- `food_name`
- `calories`
- `protein`
- `carbs`
- `fat`
- `notes`
- `is_estimate`
- `created_at`

## API Design

All routes require existing Iron Log login.

### `GET /api/nutrition/day?date=YYYY-MM-DD`

Returns:

- selected date
- goals
- totals
- remaining
- entries

### `PUT /api/nutrition/goals`

Body:

```json
{
  "caloriesGoal": 2600,
  "proteinGoal": 140,
  "carbsGoal": 300,
  "fatGoal": 75
}
```

### `POST /api/nutrition/entries`

Body:

```json
{
  "entryDate": "2026-05-11",
  "mealType": "breakfast",
  "foodName": "2 eggs and banana",
  "calories": 245,
  "protein": 13.3,
  "carbs": 27,
  "fat": 10,
  "notes": "estimated",
  "isEstimate": true
}
```

### `DELETE /api/nutrition/entries/:id`

Deletes one entry for the logged-in user.

### `POST /api/nutrition/estimate`

Body:

```json
{
  "description": "2 eggs and a banana"
}
```

Response:

```json
{
  "foodName": "2 eggs and a banana",
  "calories": 245,
  "protein": 13,
  "carbs": 27,
  "fat": 10,
  "note": "Estimate only. Check labels when possible."
}
```

If Gemini is unavailable:

```json
{
  "message": "Coach Fox estimate is unavailable right now. Enter macros manually."
}
```

## Backend Architecture

Recommended files:

- `server/routes/nutrition.js`
- `server/services/nutritionStore.js`

`nutritionStore` handles:

- schema creation
- goals read/write
- entries create/list/delete
- totals and remaining calculations

`nutrition` route handles:

- request validation
- auth user scoping
- Gemini estimate endpoint
- JSON API responses

## Frontend Architecture

Recommended files:

- `public/nutrition.html`
- `public/scripts/nutrition.js`
- additions to `public/styles/main.css`
- update `public/sw.js` cache list
- update nav on all app pages

## Safety / Tone

Nutrition tracker should avoid body-shaming or extreme diet language.

Use neutral labels:

- `Goal`
- `Eaten`
- `Remaining`
- `Over goal`

Coach Fox estimates must say they are estimates, not exact nutrition facts.

If user asks Coach Fox for medical diet advice, allergy advice, or eating disorder-like advice, use the existing safe medical-support behavior.

## Validation

Minimum checks:

- `node --check server/routes/nutrition.js`
- `node --check server/services/nutritionStore.js`
- `node --check public/scripts/nutrition.js`
- `/api/nutrition/day` requires login.
- Goals save and reload per user.
- Entry saves and appears in selected day.
- Totals/remaining calculate correctly.
- Delete removes only the logged-in user's entry.
- Estimate endpoint returns editable macro estimate when Gemini works.
- Estimate endpoint fails gracefully when Gemini is unavailable.
- Nutrition page serves and nav link works.

## Future V2 Ideas

- Common food favorites.
- Copy yesterday's meals.
- Weekly macro average.
- Coach Fox explains the day: `You are low on protein today.`
- Photo-based food estimate.
- Integrate nutrition summary into Dashboard.
