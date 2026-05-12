# Nutrition Progress Polish Design

## Goal

Polish the Nutrition page so the progress view is easier to understand at a glance.

This is **not** a new logging system. The food entry form stays mostly the same. The focus is the top summary, macro progress cards, and daily meal breakdown.

## User Choice

Eddie chose option **B: Better progress view**.

## Scope

### Included

- Add a stronger top summary called `Today's fuel`.
- Show calories eaten and calories left/over prominently.
- Show a simple daily status message.
- Improve macro cards with clearer numbers and stronger left/over labels.
- Add meal breakdown totals for:
  - breakfast
  - lunch
  - dinner
  - snack
- Keep styling consistent with Iron Log's light colorful theme.
- Keep everything per-user and based on the selected date.

### Not Included

- No new backend database tables.
- No barcode scanning.
- No food database search.
- No meal plan generator.
- No paid feature gates.
- No major redesign of the food entry form.

## UX Design

### 1. Today's fuel summary

Place this near the top of `nutrition.html`, below the hero/date area and above the macro grid.

It should show:

- selected day label
- calories eaten
- calories goal
- calories left or over
- short status message

Examples:

```text
Today's fuel
820 / 2600 kcal
1780 kcal left
On track — keep protein steady.
```

If no calorie goal is set:

```text
Set a calorie goal to unlock your daily fuel summary.
```

### 2. Status message rules

Use simple non-medical guidance. No diet prescriptions.

Rules:

- If no calorie goal: `Set a calorie goal to unlock your daily fuel summary.`
- If calories are over goal: `Over goal today — adjust the next meal calmly.`
- If protein goal exists and protein is below 50% while calories are above 50%: `Protein is behind — add a protein-focused food next.`
- If calories are below 80% of goal: `On track — keep logging as you go.`
- Otherwise: `Nice pace — finish the day steady.`

Tone should be motivating, not shamey.

### 3. Macro cards polish

Current macro cards already exist. Improve them visually and textually:

- bigger main number
- clearer goal line
- stronger remaining/over text
- progress bar should cap visually at 100%, but still say over goal in text
- no confusing 120% bar overflow

Example card:

```text
Protein
63g eaten
Goal 140g
77g left
```

If over:

```text
Fat
82g eaten
Goal 75g
7g over
```

If no goal:

```text
Carbs
0g eaten
No goal set
```

### 4. Meal breakdown

Add a new panel called `Meal breakdown`.

Show four compact rows/cards:

- Breakfast
- Lunch
- Dinner
- Snack

Each shows totals for:

- calories
- protein
- carbs
- fat

Example:

```text
Breakfast
420 kcal · 24g protein · 38g carbs · 12g fat
```

If a meal has no entries:

```text
No food logged
```

This should be derived from existing `day.entries` on the frontend. No backend change needed.

## Frontend Architecture

Files likely changed:

- `public/nutrition.html`
- `public/scripts/nutrition.js`
- `public/styles/main.css`

Suggested element IDs:

- `nutritionFuelSummary`
- `fuelDayLabel`
- `fuelCaloriesMain`
- `fuelCaloriesMeta`
- `fuelStatus`
- `mealBreakdown`

Suggested JS helpers:

- `renderFuelSummary(day)`
- `getFuelStatus(goals, totals)`
- `renderMealBreakdown(entries)`
- `sumEntriesByMeal(entries)`

## Data Flow

Use existing endpoint:

```text
GET /api/nutrition/day?date=YYYY-MM-DD
```

The endpoint already returns:

- goals
- totals
- remaining
- entries

The frontend derives:

- calorie summary
- status message
- meal breakdown totals

No API changes are required.

## Error Handling

- If loading the day fails, keep the existing error messages.
- If entries are missing or malformed, treat them as an empty list.
- If numeric values are missing, treat them as `0`.
- If goals are missing, show no-goal states instead of broken math.

## Validation

Minimum checks:

- `node --check public/scripts/nutrition.js`
- Nutrition page serves after login.
- Existing food entries still render.
- Macro cards still render with and without goals.
- Today's fuel summary handles:
  - no goal
  - under goal
  - over goal
  - low protein condition
- Meal breakdown shows totals grouped by meal type.
- Saving/deleting entries still refreshes summary and breakdown.

## Success Criteria

Nutrition should feel like a daily progress screen, not just a data-entry page.

A user should be able to open the page and understand in under five seconds:

- how many calories they ate
- whether they are under or over goal
- which macros need attention
- which meals contributed most
