# Coach Fox Chatbot V1 Design

## Goal

Add a simple local chatbot to Iron Log for daily fitness use. The first version is not a real AI model. It answers common beginner nutrition and workout questions from local app logic/data.

The feature should make Iron Log feel more useful day-to-day without adding API keys, accounts with external services, or complex AI infrastructure.

## Scope

### Included

- New `Chat` page in the app navigation.
- Page title/personality: `Coach Fox`.
- Local-only answers for common nutrition questions.
- Local-only answers for common beginner workout questions.
- Short, beginner-friendly responses.
- Clear fallback when Coach Fox does not know something yet.

### Not included in V1

- No OpenAI/Claude/Gemini API.
- No internet food database lookup.
- No medical advice.
- No custom meal plans.
- No memory of chat history after refresh unless later added.
- No automatic workout logging from chat.

## User Experience

The user opens a new `Chat` page from the nav.

The page shows:

- Coach Fox header with small friendly helper copy.
- Chat message area.
- Input box with send button.
- A few example prompt chips, such as:
  - `How much protein in 2 eggs?`
  - `Calories in a banana?`
  - `What is bench press?`
  - `How many sets should a beginner do?`

Answers should be short and clear.

Example:

User: `how much protein in 2 eggs`

Coach Fox:

> 2 large eggs have about 12g protein and 140 calories. Simple, solid snack. 🦊

Unknown food fallback:

> I don't know that yet — ask Shinoske to add it.

## Nutrition Behavior

Nutrition answers come from a small local food table in frontend JavaScript or a simple backend route.

V1 food examples should include at least:

- egg
- banana
- chicken breast
- cooked rice
- milk
- oats
- greek yogurt
- peanut butter
- tuna
- apple

Each food record should include:

- display name
- serving label
- protein grams
- calories
- aliases

The parser should handle simple quantity phrases:

- `1 egg`
- `2 eggs`
- `one banana`
- `100g chicken breast` can be handled later if not simple enough for V1; if included, make it explicit and modest.

V1 can assume common serving sizes when the user does not specify an amount.

## Workout Behavior

Workout answers come from a small local knowledge map.

V1 should cover simple beginner questions like:

- `what is bench press`
- `what is squat`
- `what is deadlift`
- `what is pull up`
- `what is row`
- `how many sets should a beginner do`
- `how many reps for muscle`
- `should I train every day`

Answers should avoid overconfidence. Keep them general and safe.

Example:

> Bench press is a chest exercise where you press weight upward while lying on a bench. Start light, control the bar, and use a spotter if the weight is heavy.

## Safety / Tone

Coach Fox is a simple helper, not a doctor or professional coach.

It should:

- be friendly and short
- explain at beginner level
- encourage safe lifting
- suggest asking an adult/coach/doctor for pain, injuries, or medical problems
- avoid strict diet rules or body-shaming language

## Architecture

Recommended V1 architecture:

- `public/chat.html` — page structure.
- `public/scripts/chat.js` — local parsing and response logic.
- `public/styles/main.css` — chat UI styling using existing global light theme.
- Update all page navs to include `Chat`.
- Update `public/sw.js` cache list to include chat page/script.

No database changes are required for V1.

This keeps the feature simple and easy to extend later. If V2 adds real AI, we can add a backend route and API provider configuration then.

## Error Handling

Because V1 is local-only, errors should be rare.

Fallbacks:

- Empty input: show `Ask me a food or workout question.`
- Unknown topic: show `I don't know that yet — ask Shinoske to add it.`
- Injury/medical-like question: show a safe reminder to ask a real doctor/coach.

## Testing

Minimum validation before shipping:

- `node --check public/scripts/chat.js`
- Serve `/chat.html` locally.
- Confirm nav link appears on pages.
- Confirm example prompts work.
- Confirm known food question works.
- Confirm known workout question works.
- Confirm unknown question shows fallback.
- Confirm service worker cache version updates.

## Future V2 Ideas

- Add more foods.
- Add grams-based nutrition calculations.
- Save favorite questions.
- Add real AI API later.
- Let Coach Fox explain the user's own workout history.
- Let Coach Fox help create workout drafts, but only after user confirmation.
