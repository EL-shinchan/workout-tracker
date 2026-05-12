document.addEventListener("DOMContentLoaded", function () {
  const chatMessages = document.getElementById("chatMessages");
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const promptChips = Array.from(document.querySelectorAll(".prompt-chip"));
  const AI_UNAVAILABLE_MESSAGE = "Coach Fox AI is unavailable right now. I can still answer common food and exercise basics locally — try asking about lat pulldown, lateral raise, protein, or calories.";

  const foods = [
    { name: "large egg", aliases: ["egg", "eggs"], serving: "1 large egg", protein: 6, calories: 70 },
    { name: "banana", aliases: ["banana", "bananas"], serving: "1 medium banana", protein: 1.3, calories: 105 },
    { name: "chicken breast", aliases: ["chicken", "chicken breast"], serving: "100g cooked chicken breast", protein: 31, calories: 165 },
    { name: "cooked rice", aliases: ["rice", "cooked rice", "white rice"], serving: "1 cup cooked rice", protein: 4.3, calories: 205 },
    { name: "milk", aliases: ["milk"], serving: "1 cup milk", protein: 8, calories: 150 },
    { name: "oats", aliases: ["oat", "oats", "oatmeal"], serving: "1/2 cup dry oats", protein: 5, calories: 150 },
    { name: "greek yogurt", aliases: ["greek yogurt", "yogurt"], serving: "170g greek yogurt", protein: 17, calories: 100 },
    { name: "peanut butter", aliases: ["peanut butter", "pb"], serving: "2 tbsp peanut butter", protein: 8, calories: 190 },
    { name: "tuna", aliases: ["tuna"], serving: "1 can tuna", protein: 25, calories: 120 },
    { name: "apple", aliases: ["apple", "apples"], serving: "1 medium apple", protein: 0.5, calories: 95 }
  ];

  const workoutAnswers = [
    {
      keys: ["lat pulldown", "lat pull down", "pulldown", "pull down machine"],
      answer: "Lat pulldown trains your lats, upper back, and biceps. Sit tall, pull the bar toward your upper chest, and think elbows down toward your ribs. Don’t yank with your body — use a weight you can control."
    },
    {
      keys: ["lateral raise", "lat raise", "side raise", "dumbbell raise"],
      answer: "Lateral raise trains the side of your shoulders. Hold dumbbells by your sides, raise them out until about shoulder height, then lower slowly. Keep it light and controlled — swinging turns it into an ego exercise, not shoulder work."
    },
    {
      keys: ["shoulder press", "overhead press", "military press"],
      answer: "Shoulder press trains your shoulders and triceps by pressing weight overhead. Brace your core, press straight up, and lower under control. Don’t arch your back hard just to move heavier weight."
    },
    {
      keys: ["bicep curl", "biceps curl", "curl"],
      answer: "Bicep curls train the front of your upper arm. Keep your elbows mostly still, curl the weight up, then lower slowly. If your whole body is swinging, the weight is too heavy."
    },
    {
      keys: ["tricep pushdown", "triceps pushdown", "pushdown"],
      answer: "Tricep pushdown trains the back of your upper arm. Keep elbows close to your sides, push the handle down, and squeeze at the bottom. Don’t let your shoulders roll forward."
    },
    {
      keys: ["leg press"],
      answer: "Leg press trains quads, glutes, and hamstrings by pushing a platform away with your feet. Keep your feet flat and knees tracking the same direction as your toes. Don’t lock your knees hard at the top."
    },
    {
      keys: ["leg curl", "hamstring curl"],
      answer: "Leg curl trains your hamstrings, the back of your thighs. Curl the pad toward you, pause briefly, then lower slowly. Keep your hips down and don’t bounce the weight."
    },
    {
      keys: ["leg extension", "quad extension"],
      answer: "Leg extension trains your quads, the front of your thighs. Extend your knees until your legs are nearly straight, then lower with control. Start light if your knees feel sensitive."
    },
    {
      keys: ["romanian deadlift", "rdl"],
      answer: "Romanian deadlift trains hamstrings, glutes, and your hip hinge. Push your hips back, keep your back neutral, and lower the weight close to your legs. Stop when you feel a hamstring stretch — don’t chase the floor."
    },
    {
      keys: ["calf raise", "calves"],
      answer: "Calf raises train the calves by lifting your heels up and lowering them slowly. Use a full range of motion and pause at the top. Don’t bounce fast reps — controlled reps work better."
    },
    {
      keys: ["bench press", "bench"],
      answer: "Bench press is a chest exercise where you press weight upward while lying on a bench. Start light, control the bar, and use a spotter when it gets heavy."
    },
    {
      keys: ["squat", "squats"],
      answer: "A squat trains legs and glutes by bending your knees and hips, then standing back up. Keep your chest tall, brace your core, and use a weight you can control."
    },
    {
      keys: ["deadlift", "dead lift"],
      answer: "Deadlift is a hip-hinge lift where you pick weight up from the floor. Keep your back neutral, push through the floor, and do not rush heavy weight."
    },
    {
      keys: ["pull up", "pull-up", "pullup"],
      answer: "A pull-up trains your back and arms by pulling your body up to a bar. If full pull-ups are hard, use assisted pull-ups or slow negatives."
    },
    {
      keys: ["row", "rows"],
      answer: "Rows train your back by pulling weight toward you. Think: chest proud, shoulders down, pull with elbows, not just hands."
    },
    {
      keys: ["sets", "beginner", "how many sets"],
      answer: "For beginners, 2–3 working sets per exercise is usually enough. Leave 1–3 reps in the tank and focus on clean form first."
    },
    {
      keys: ["reps", "muscle", "hypertrophy"],
      answer: "For building muscle, 6–12 reps is a solid default. Higher reps can work too if the set is controlled and close to challenging."
    },
    {
      keys: ["train every day", "workout every day", "lift every day"],
      answer: "You can move every day, but hard lifting every day is usually too much for beginners. Train 3–4 days a week and let muscles recover."
    }
  ];

  const numberWords = new Map([
    ["one", 1], ["two", 2], ["three", 3], ["four", 4], ["five", 5],
    ["six", 6], ["seven", 7], ["eight", 8], ["nine", 9], ["ten", 10]
  ]);

  function addMessage(role, text) {
    const message = document.createElement("div");
    message.className = `chat-message ${role}`;
    const label = document.createElement("span");
    label.className = "chat-message-label";
    label.textContent = role === "bot" ? "Coach Fox" : "You";
    const bubble = document.createElement("p");
    bubble.textContent = text;
    message.append(label, bubble);
    chatMessages.append(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return message;
  }

  function updateMessage(message, text) {
    const bubble = message && message.querySelector("p");
    if (bubble) {
      bubble.textContent = text;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function normalize(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s.'-]/g, " ").replace(/\s+/g, " ").trim();
  }

  function quantityFor(text, food) {
    for (const alias of food.aliases) {
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const digitMatch = text.match(new RegExp(`(?:^|\\s)(\\d+(?:\\.\\d+)?)\\s+${escapedAlias}(?:\\s|$)`));
      if (digitMatch) {
        return Number(digitMatch[1]);
      }

      for (const [word, value] of numberWords.entries()) {
        if (new RegExp(`(?:^|\\s)${word}\\s+${escapedAlias}(?:\\s|$)`).test(text)) {
          return value;
        }
      }
    }

    return 1;
  }

  function hasAlias(text, alias) {
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|\\s)${escapedAlias}(\\s|$)`).test(text);
  }

  function findFood(text) {
    return foods.find((food) => food.aliases.some((alias) => hasAlias(text, alias)));
  }

  function safetyAnswer(rawQuestion) {
    const question = normalize(rawQuestion);
    if (!/pain|injur|hurt|doctor|medical|sick|ill|allerg|vomit|dizzy|faint|fever|breath|chest|medicine|medication/.test(question)) {
      return null;
    }

    if (/chest|breath|faint|severe|numb|can't walk|can’t walk|cant walk|cannot walk|high fever/.test(question)) {
      return "That sounds serious — please tell an adult now and get medical help quickly. Stop training, rest somewhere safe, and don’t try to push through it. Coach Fox can help with basics, but this needs real-world help.";
    }

    return "Ouch — sorry you’re dealing with that. Stop hard training for now, rest, hydrate if you’re sick, and avoid anything that makes it worse. If it’s sharp, swelling, getting worse, unusual, or doesn’t improve, tell an adult and get checked by a doctor, physio, or coach.";
  }

  function nutritionAnswer(rawQuestion) {
    const question = normalize(rawQuestion);
    const food = findFood(question);
    if (!food) {
      return null;
    }

    const quantity = quantityFor(question, food);
    const protein = food.protein * quantity;
    const calories = food.calories * quantity;
    const qtyText = quantity === 1 ? food.serving : `${quantity} × ${food.serving}`;
    const proteinText = Number.isInteger(protein) ? protein : protein.toFixed(1);
    const calorieText = Math.round(calories);

    return `${qtyText} has about ${proteinText}g protein and ${calorieText} calories. Simple estimate, but good enough for daily tracking. 🦊`;
  }

  function workoutAnswer(rawQuestion) {
    const question = normalize(rawQuestion);
    const exact = workoutAnswers.find((entry) => entry.keys.some((key) => question.includes(key)));
    return exact ? exact.answer : null;
  }

  function localAnswer(question) {
    const cleaned = normalize(question);
    if (!cleaned) {
      return "Ask me a food or workout question.";
    }

    return safetyAnswer(cleaned) || nutritionAnswer(cleaned) || workoutAnswer(cleaned);
  }

  async function askAi(question) {
    const response = await window.appUtils.postJSON("/api/chat", { message: question });
    return response.reply || AI_UNAVAILABLE_MESSAGE;
  }

  async function submitQuestion(question) {
    const text = String(question || "").trim();
    if (!text) {
      addMessage("bot", localAnswer(text));
      chatInput.value = "";
      chatInput.focus();
      return;
    }

    addMessage("user", text);
    const reply = localAnswer(text);
    if (reply) {
      addMessage("bot", reply);
    } else {
      const thinkingMessage = addMessage("bot", "Coach Fox is thinking...");
      try {
        updateMessage(thinkingMessage, await askAi(text));
      } catch (_error) {
        updateMessage(thinkingMessage, AI_UNAVAILABLE_MESSAGE);
      }
    }

    chatInput.value = "";
    chatInput.focus();
  }

  chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    submitQuestion(chatInput.value);
  });

  promptChips.forEach((chip) => {
    chip.addEventListener("click", function () {
      submitQuestion(chip.textContent);
    });
  });

  addMessage("bot", "Hey, I’m Coach Fox. Ask me simple food, workout, or daily fitness questions. I’ll use local basics first, then AI if I need more brainpower.");

  const initialAsk = new URLSearchParams(window.location.search).get("ask");
  if (initialAsk) {
    submitQuestion(initialAsk);
    window.history.replaceState({}, "", "chat.html");
  }
});
