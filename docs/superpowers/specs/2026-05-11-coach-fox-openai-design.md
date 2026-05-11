# Coach Fox V2 OpenAI Design

## Goal

Upgrade Coach Fox from a simple local helper into a real AI chatbot using OpenAI, while keeping the app safe, local-key-only, and beginner-friendly.

V2 should preserve the working V1 experience and add AI answers when the local food/workout logic does not know enough.

## Scope

### Included

- Keep the existing `Chat` page and Coach Fox personality.
- Add backend route: `POST /api/chat`.
- Use OpenAI from the server only.
- Store OpenAI API key in a local ignored `.env` file.
- Keep local safety handling for pain, injury, sickness, allergy, or medical-like questions.
- Keep local nutrition/workout quick answers as a fast first layer.
- Use AI only when local logic cannot answer.
- Return short beginner-friendly answers.
- Show a clear fallback if AI is unavailable.

### Not Included

- No API key in frontend JavaScript.
- No API key committed to GitHub.
- No chat history database yet.
- No workout-writing actions from chat yet.
- No medical diagnosis.
- No automatic food logging yet.

## User Experience

The user still opens `Chat` and talks to `Coach Fox`.

Behavior:

1. User asks a question.
2. Frontend first checks local V1 logic.
3. If local logic has a strong answer, it responds immediately.
4. If local logic does not know, frontend calls backend `POST /api/chat`.
5. Backend calls OpenAI and returns Coach Fox's answer.
6. If OpenAI fails, frontend shows:

> Coach Fox AI is unavailable right now. Local basics still work.

## API Design

### `POST /api/chat`

Request body:

```json
{
  "message": "how much protein should I eat?"
}
```

Response body:

```json
{
  "reply": "A simple target is about 1.6g protein per kg bodyweight per day if you train seriously. Start with consistent meals first. 🦊"
}
```

Error response:

```json
{
  "message": "Coach Fox AI is unavailable right now."
}
```

## Backend Architecture

Recommended files:

- `server/routes/chat.js`
- `server/services/openAiChat.js`

Server route responsibilities:

- require auth like other app APIs
- validate message is a short non-empty string
- block/redirect medical-risk prompts to safety response without calling OpenAI
- call OpenAI service
- return JSON reply

OpenAI service responsibilities:

- read `OPENAI_API_KEY` from environment
- call OpenAI Responses API or Chat Completions API
- enforce short timeout
- return plain text only
- throw clear errors when unavailable

## Local Config

Use `.env` locally:

```text
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Add `.env` to `.gitignore` if not already ignored.

The server should load environment variables using `dotenv`.

## Coach Fox AI Prompt

System behavior:

- You are Coach Fox inside Iron Log.
- Help with beginner fitness, nutrition, exercise basics, and healthy routines.
- Keep answers short: usually 2-5 sentences.
- Be friendly, direct, and beginner-safe.
- Do not diagnose medical problems.
- For pain, injury, illness, allergies, medication, eating disorder, or medical concerns, tell the user to ask a real doctor/physio/coach/adult.
- Avoid body shaming, extreme dieting, or dangerous advice.
- Mention estimates when nutrition numbers vary.

## Frontend Changes

Update `public/scripts/chat.js`:

- Keep local V1 answer functions.
- Add async submit handling.
- If local logic returns fallback unknown answer, call `/api/chat`.
- Show a temporary message like `Coach Fox is thinking...`.
- Replace/update that message with AI response.
- If backend fails, show unavailable fallback.

## Security / Privacy

- API key must only exist on the server.
- Browser must never receive the OpenAI key.
- Do not log full chat messages by default.
- Route must require the existing Iron Log login session.
- Limit message length to prevent abuse, e.g. 800 characters.
- Keep answers text-only; frontend should insert response with `textContent`.

## Testing

Minimum validation:

- `npm install` after adding dependencies.
- `node --check server/routes/chat.js`
- `node --check server/services/openAiChat.js`
- `node --check public/scripts/chat.js`
- Login required: `/api/chat` returns 401 when logged out.
- Local known question still works without OpenAI call.
- Unknown question calls `/api/chat`.
- Missing API key returns clean unavailable message.
- With API key set, OpenAI response appears in chat.
- Confirm `.env` is ignored by Git.

## Future V3 Ideas

- Let Coach Fox read the user's workout history and explain progress.
- Save chat history locally.
- Let Coach Fox create workout drafts after confirmation.
- Add food logging.
- Add per-user preferences.
