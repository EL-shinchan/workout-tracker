const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";
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
  return process.env.OPENAI_API_KEY || "";
}

function getModel() {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

function cleanReply(value) {
  return String(value || "").trim().replace(/\n{3,}/g, "\n\n");
}

async function askOpenAi(message) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw unavailableError("OpenAI API key is not configured.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: 0.4,
        max_tokens: 240,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: message }
        ]
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw unavailableError((data.error && data.error.message) || "OpenAI request failed.");
    }

    const reply = cleanReply(data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content);
    if (!reply) {
      throw unavailableError("OpenAI returned an empty reply.");
    }

    return reply;
  } catch (error) {
    if (error.name === "AbortError") {
      throw unavailableError("OpenAI request timed out.");
    }

    if (error.code === "AI_UNAVAILABLE") {
      throw error;
    }

    throw unavailableError(error.message);
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { askOpenAi };
