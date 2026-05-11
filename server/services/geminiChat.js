const DEFAULT_MODEL = "gemini-1.5-flash";
const REQUEST_TIMEOUT_MS = 15000;

const SYSTEM_PROMPT = `You are Coach Fox inside Iron Log.
Help with beginner fitness, nutrition, exercise basics, and healthy routines.
Keep answers short: usually 2-5 sentences.
Be friendly, direct, and beginner-safe.
For normal fitness/nutrition questions, answer clearly and practically.
For pain, injury, illness, allergies, medication, eating disorder, or medical concerns:
- start with kindness and validation
- give general first-step safety guidance only
- do not diagnose the cause
- do not prescribe medication or treatment
- advise stopping hard training if symptoms are sharp, worsening, or unusual
- tell the user to ask a parent/adult/doctor/physio/coach when symptoms are serious, persistent, or unclear
- mention red flags when relevant
Avoid body shaming, extreme dieting, or dangerous advice.
Mention estimates when nutrition numbers vary.`;

function unavailableError(message = "Coach Fox AI is unavailable right now.") {
  const error = new Error(message);
  error.code = "AI_UNAVAILABLE";
  return error;
}

function getApiKey() {
  return process.env.GEMINI_API_KEY || "";
}

function getModel() {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

function cleanReply(value) {
  return String(value || "").trim().replace(/\n{3,}/g, "\n\n");
}

function geminiUrl() {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getModel())}:generateContent`;
}

async function askGemini(message) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw unavailableError("Gemini API key is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(geminiUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: message }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 240
        }
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw unavailableError((data.error && data.error.message) || "Gemini request failed.");
    }

    const reply = cleanReply(
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.map((part) => part.text || "").join("\n")
    );

    if (!reply) {
      throw unavailableError("Gemini returned an empty reply.");
    }

    return reply;
  } catch (error) {
    if (error.name === "AbortError") {
      throw unavailableError("Gemini request timed out.");
    }

    if (error.code === "AI_UNAVAILABLE") {
      throw error;
    }

    throw unavailableError(error.message);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { askGemini };
