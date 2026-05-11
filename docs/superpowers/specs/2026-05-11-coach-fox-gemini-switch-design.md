# Coach Fox Gemini Switch Design

## Goal

Switch Coach Fox V2 from OpenAI to Gemini because OpenAI API quota/billing blocks Eddie right now. Keep the same app experience and safety behavior.

## Design

- Keep `Chat` page and Coach Fox personality.
- Keep local answers first for known food/workout questions.
- Keep local kind medical/wellness safety replies for pain, injury, sickness, allergy, and red flags.
- Replace OpenAI backend service with Gemini backend service.
- Keep existing `POST /api/chat` route so frontend does not need a new API path.
- Store Gemini key server-side only in `.env`:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-1.5-flash
```

- Default model: `gemini-1.5-flash`.
- If Gemini fails or key is missing, show the existing friendly fallback:

```text
Coach Fox AI is unavailable right now. Local basics still work.
```

## Files

- Add `server/services/geminiChat.js`.
- Update `server/routes/chat.js` to call Gemini.
- Remove `server/services/openAiChat.js`.
- Update `.env.example` to Gemini variables.
- Update Chat page copy from OpenAI fallback to Gemini fallback.

## Security

- Gemini API key must never be committed.
- Browser must never receive the key.
- `.env` and `.env.*` stay ignored.
- `/api/chat` remains protected by existing login middleware.

## Validation

- `node --check server/services/geminiChat.js`
- `node --check server/routes/chat.js`
- `node --check public/scripts/chat.js`
- `/api/chat` returns 401 when logged out.
- Missing Gemini key returns clean fallback.
- Local medical red-flag response still works.
- With Gemini key set, unknown chat question gets Gemini answer.
